import {
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
  pipeline,
} from "@huggingface/transformers";

import { MODEL_ID } from "./constants";
import { SpeechToTextWorkerMessage, SpeechToTextWorkerResponse } from "./types";

let whisperPipeline: AutomaticSpeechRecognitionPipeline | null = null;

async function initializeWhisper(request_id: string) {
  if (!whisperPipeline) {
    // @ts-ignore
    whisperPipeline = await pipeline("automatic-speech-recognition", MODEL_ID, {
      device: "webgpu",
      progress_callback: (p: ProgressInfo) =>
        postMessage({
          status: "progress",
          progress: p,
          id: request_id,
        }),
    });
  }
  return whisperPipeline;
}

self.addEventListener(
  "message",
  async (event: MessageEvent<SpeechToTextWorkerMessage>) => {
    const { id, audioData, sampleRate } = event.data;

    try {
      postMessage({
        id,
        status: "loading",
      });

      const pipeline = await initializeWhisper(id);
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

      postMessage({
        id,
        status: "complete",
        text,
      });
    } catch (error) {
      console.error("Speech to text error:", error);

      postMessage({
        id,
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
);

const postMessage = (message: SpeechToTextWorkerResponse) =>
  self.postMessage(message);
