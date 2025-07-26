import { AutoModel, Tensor } from "@huggingface/transformers";

import {
  EXIT_THRESHOLD,
  INPUT_SAMPLE_RATE,
  MAX_BUFFER_DURATION,
  MAX_NUM_PREV_BUFFERS,
  MIN_SILENCE_DURATION_SAMPLES,
  MIN_SPEECH_DURATION_SAMPLES,
  SPEECH_PAD_SAMPLES,
  SPEECH_THRESHOLD,
} from "./constants";

interface VadWorkerMessage {
  type: "init" | "audio" | "reset";
  buffer?: Float32Array;
}

interface VadWorkerResponse {
  type: "ready" | "speech_start" | "speech_end" | "speech_chunk" | "error";
  buffer?: Float32Array;
  start?: number;
  end?: number;
  duration?: number;
  error?: string;
}

// Load VAD model
let silero_vad: any = null;
let isInitialized = false;

async function initializeVAD() {
  if (isInitialized) return;

  try {
    silero_vad = await AutoModel.from_pretrained("onnx-community/silero-vad", {
      // @ts-expect-error
      config: { model_type: "custom" },
      dtype: "fp32",
    });

    isInitialized = true;
    self.postMessage({ type: "ready" } as VadWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: "error",
      error:
        error instanceof Error ? error.message : "Failed to initialize VAD",
    } as VadWorkerResponse);
  }
}

// Global audio buffer to store incoming audio
const BUFFER = new Float32Array(MAX_BUFFER_DURATION * INPUT_SAMPLE_RATE);
let bufferPointer = 0;

// Initial state for VAD
const sr = new Tensor("int64", [INPUT_SAMPLE_RATE], []);
let state = new Tensor("float32", new Float32Array(2 * 1 * 128), [2, 1, 128]);

// VAD state tracking
let isRecording = false;
let postSpeechSamples = 0;
let prevBuffers: Float32Array[] = [];

/**
 * Perform Voice Activity Detection (VAD)
 * @param {Float32Array} buffer The new audio buffer
 * @returns {Promise<boolean>} `true` if the buffer is speech, `false` otherwise.
 */
async function vad(buffer: Float32Array): Promise<boolean> {
  if (!silero_vad) throw new Error("VAD not initialized");

  const input = new Tensor("float32", buffer, [1, buffer.length]);
  const { stateN, output } = await silero_vad({ input, sr, state });
  state = stateN; // Update state

  const isSpeech = output.data[0];

  // Use heuristics to determine if the buffer is speech or not
  return (
    // Case 1: We are above the threshold (definitely speech)
    isSpeech > SPEECH_THRESHOLD ||
    // Case 2: We are in the process of recording, and the probability is above the negative (exit) threshold
    (isRecording && isSpeech >= EXIT_THRESHOLD)
  );
}

function resetAfterRecording(offset = 0) {
  BUFFER.fill(0, offset);
  bufferPointer = offset;
  isRecording = false;
  postSpeechSamples = 0;
}

function dispatchSpeechChunk(overflow?: Float32Array) {
  // Get timing information
  const now = Date.now();
  const end =
    now - ((postSpeechSamples + SPEECH_PAD_SAMPLES) / INPUT_SAMPLE_RATE) * 1000;
  const start = end - (bufferPointer / INPUT_SAMPLE_RATE) * 1000;
  const duration = end - start;
  const overflowLength = overflow?.length ?? 0;

  // Combine previous buffers with current buffer
  const buffer = BUFFER.slice(0, bufferPointer + SPEECH_PAD_SAMPLES);
  const prevLength = prevBuffers.reduce((acc, b) => acc + b.length, 0);
  const paddedBuffer = new Float32Array(prevLength + buffer.length);

  let offset = 0;
  for (const prev of prevBuffers) {
    paddedBuffer.set(prev, offset);
    offset += prev.length;
  }
  paddedBuffer.set(buffer, offset);

  // Send speech chunk
  self.postMessage(
    {
      type: "speech_chunk",
      buffer: paddedBuffer,
      start,
      end,
      duration,
    } as VadWorkerResponse,
    // @ts-ignore
    [paddedBuffer.buffer]
  );

  // Handle overflow and reset
  if (overflow) {
    BUFFER.set(overflow, 0);
  }
  resetAfterRecording(overflowLength);
}

function resetState() {
  BUFFER.fill(0);
  bufferPointer = 0;
  isRecording = false;
  postSpeechSamples = 0;
  prevBuffers = [];
  state = new Tensor("float32", new Float32Array(2 * 1 * 128), [2, 1, 128]);
}

// Handle messages from main thread
self.addEventListener(
  "message",
  async (event: MessageEvent<VadWorkerMessage>) => {
    const { type, buffer } = event.data;

    switch (type) {
      case "init":
        await initializeVAD();
        return;

      case "reset":
        resetState();
        return;

      case "audio":
        if (!buffer || !isInitialized) return;
        await processAudioBuffer(buffer);
        return;
    }
  }
);

async function processAudioBuffer(buffer: Float32Array) {
  const wasRecording = isRecording;
  const isSpeech = await vad(buffer);

  if (!wasRecording && !isSpeech) {
    // Not recording and no speech - add to previous buffers queue
    if (prevBuffers.length >= MAX_NUM_PREV_BUFFERS) {
      prevBuffers.shift();
    }
    prevBuffers.push(buffer);
    return;
  }

  // Check if buffer exceeds remaining space
  const remaining = BUFFER.length - bufferPointer;
  if (buffer.length >= remaining) {
    // Buffer overflow - dispatch current chunk and start new one
    BUFFER.set(buffer.subarray(0, remaining), bufferPointer);
    bufferPointer += remaining;

    const overflow = buffer.subarray(remaining);
    dispatchSpeechChunk(overflow);
    return;
  } else {
    // Normal case - add buffer to global buffer
    BUFFER.set(buffer, bufferPointer);
    bufferPointer += buffer.length;
  }

  if (isSpeech) {
    if (!isRecording) {
      // Start of speech detected
      self.postMessage({ type: "speech_start" } as VadWorkerResponse);
      isRecording = true;
    }
    postSpeechSamples = 0; // Reset silence counter
    return;
  }

  // No speech in current buffer
  postSpeechSamples += buffer.length;

  // Check if we should end the speech chunk
  if (postSpeechSamples < MIN_SILENCE_DURATION_SAMPLES) {
    // Short pause - continue recording
    return;
  }

  if (bufferPointer < MIN_SPEECH_DURATION_SAMPLES) {
    // Speech too short - discard
    resetAfterRecording();
    return;
  }

  // End of speech chunk - dispatch it
  self.postMessage({ type: "speech_end" } as VadWorkerResponse);
  dispatchSpeechChunk();
}

export {};
