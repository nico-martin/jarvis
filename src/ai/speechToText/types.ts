import { ProgressInfo } from "@huggingface/transformers";

export interface SpeechToTextWorkerMessage {
  id: string;
  audioData: Float32Array;
  sampleRate: number;
}

interface SpeechToTextWorkerResponseAudio {
  id: string;
  status: "loading" | "complete" | "error";
  text?: string;
  error?: string;
}

export interface SpeechToTextWorkerResponseProgress {
  id: string;
  status: "progress";
  progress: ProgressInfo;
}

export type SpeechToTextWorkerResponse =
  | SpeechToTextWorkerResponseAudio
  | SpeechToTextWorkerResponseProgress;
