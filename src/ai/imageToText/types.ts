import { ProgressInfo } from "@huggingface/transformers";

interface ImageToTextWorkerMessageGenerate {
  type: "generate";
  data?: {
    id: string;
    image: string; // base64 data URL
    prompt: string;
  };
}

export interface ImageToTextWorkerMessageSimple {
  type: "check" | "load" | "interrupt" | "reset";
}

export type ImageToTextWorkerMessage =
  | ImageToTextWorkerMessageGenerate
  | ImageToTextWorkerMessageSimple;

interface ImageToTextWorkerResponseReady {
  status: "ready";
}

interface ImageToTextWorkerResponseLoading {
  status: "loading";
  progress?: ProgressInfo;
}

interface ImageToTextWorkerResponseError {
  status: "error";
  error: string;
  id?: string;
}

interface ImageToTextWorkerResponseStart {
  status: "start";
  id: string;
}

interface ImageToTextWorkerResponseComplete {
  status: "complete";
  id: string;
  output: string;
}

interface ImageToTextWorkerResponseUpdate {
  status: "update";
  id: string;
  output: string;
  tps: number;
  numTokens?: number;
}

export type ImageToTextWorkerResponse =
  | ImageToTextWorkerResponseReady
  | ImageToTextWorkerResponseLoading
  | ImageToTextWorkerResponseComplete
  | ImageToTextWorkerResponseStart
  | ImageToTextWorkerResponseUpdate
  | ImageToTextWorkerResponseError;
