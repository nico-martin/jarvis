import { ProgressInfo } from "@huggingface/transformers";

export type KokoroOutput = Blob;
export type KokoroInput = {
  text: string;
  voice?: string;
  speed?: number;
};
export type WorkerResponseKokoro = WorkerResponse<KokoroOutput>;
export type WorkerRequestKokoro = WorkerRequest<KokoroInput>;

export interface WorkerRequest<Input> {
  input?: Input;
  id: string;
  log?: boolean;
}

export type InitPipelineProgressEvent = {
  status: "loading";
  id: string;
  progress: ProgressInfo;
};

export type PipelineReadyEvent = {
  status: "ready";
  id: string;
};

export type TranscribeErrorEvent = {
  status: "error";
  error: any;
  id: string;
};

export type CompleteEvent<Output> = {
  status: "complete";
  output: Output;
  id: string;
};

export type WorkerResponse<Output = any> =
  | InitPipelineProgressEvent
  | PipelineReadyEvent
  | TranscribeErrorEvent
  | CompleteEvent<Output>;

export enum QueueStatus {
  ADDED_TO_QUEUE = "ADDED_TO_QUEUE",
  PENDING = "PENDING",
  ERROR = "ERROR",
  DONE = "DONE",
}

export interface QueueData {
  status: QueueStatus;
  workerStatus?: WorkerResponseKokoro["status"];
  statusText: string;
}
