export interface SpeechToTextWorkerMessage {
  id: string;
  audioData: Float32Array;
  sampleRate: number;
}

export interface SpeechToTextWorkerResponse {
  id: string;
  status: "loading" | "complete" | "error";
  text?: string;
  error?: string;
}
