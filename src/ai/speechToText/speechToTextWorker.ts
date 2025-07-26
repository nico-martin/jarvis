import {
  AutomaticSpeechRecognitionPipeline,
  pipeline,
} from "@huggingface/transformers";

interface SpeechToTextWorkerMessage {
  id: string;
  audioData: Float32Array;
  sampleRate: number;
}

interface SpeechToTextWorkerResponse {
  id: string;
  status: "loading" | "complete" | "error";
  text?: string;
  error?: string;
}

let whisperPipeline: AutomaticSpeechRecognitionPipeline | null = null;

async function initializeWhisper() {
  if (!whisperPipeline) {
    whisperPipeline = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en", //"Xenova/whisper-tiny",
      {
        device: "webgpu",
      }
    );
  }
  return whisperPipeline;
}

self.addEventListener(
  "message",
  async (event: MessageEvent<SpeechToTextWorkerMessage>) => {
    const { id, audioData, sampleRate } = event.data;

    try {
      self.postMessage({
        id,
        status: "loading",
      } as SpeechToTextWorkerResponse);

      const pipeline = await initializeWhisper();
      if (sampleRate !== 16000) {
        throw new Error(`Expected 16kHz audio, got ${sampleRate}Hz`);
      }

      const result = await pipeline(audioData, {
        return_timestamps: false,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = Array.isArray(result)
        ? result[0]?.text || ""
        : result.text || "";

      self.postMessage({
        id,
        status: "complete",
        text,
      } as SpeechToTextWorkerResponse);
    } catch (error) {
      console.error("Speech to text error:", error);

      self.postMessage({
        id,
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } as SpeechToTextWorkerResponse);
    }
  }
);
