import { ProgressInfo } from "@huggingface/transformers";

export interface VadWorkerMessage {
  id: string;
  type: "init" | "audio" | "reset";
  buffer?: Float32Array;
}

export enum VoiceActivityDetectionStatus {
  IDLE = "idle",
  WAITING = "waiting",
  RECORDING = "recording",
}

interface VadWorkerResponseAudio {
  id: string;
  type: "ready" | "speech_start" | "speech_end" | "speech_chunk" | "error";
  buffer?: Float32Array;
  start?: number;
  end?: number;
  duration?: number;
  error?: string;
}

interface VadWorkerResponseProgress {
  id: string;
  type: "progress";
  progress: ProgressInfo;
}

export type VadWorkerResponse =
  | VadWorkerResponseAudio
  | VadWorkerResponseProgress;

export interface VadCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechChunk?: (
    audioBuffer: Float32Array,
    timing: { start: number; end: number; duration: number }
  ) => void;
  onError?: (error: string) => void;
}
