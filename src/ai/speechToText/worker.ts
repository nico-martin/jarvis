import {
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
  pipeline,
} from "@huggingface/transformers";

import { MODEL } from "./constants";
import { SpeechToTextWorkerMessage, SpeechToTextWorkerResponse } from "./types";

let asrPipeline: AutomaticSpeechRecognitionPipeline | null = null;

async function initializeModel(request_id: string) {
  if (!asrPipeline) {
    // @ts-ignore
    asrPipeline = await pipeline("automatic-speech-recognition", MODEL.id, {
      device: "webgpu",
      ...(MODEL.dtype ? { dtype: MODEL.dtype } : {}),
      progress_callback: (p: ProgressInfo) =>
        postMessage({
          status: "progress",
          progress: p,
          id: request_id,
        }),
    });
  }
  return asrPipeline;
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

      const pipeline = await initializeModel(id);
      if (sampleRate !== 16000) {
        throw new Error(`Expected 16kHz audio, got ${sampleRate}Hz`);
      }

      const result = await pipeline(
        audioData,
        MODEL.generateOptions(audioData, sampleRate)
      );

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
