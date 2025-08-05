export interface ConversationTransformersJSWorkerMessage {
  id: string;
  type: "preload" | "initialize-cache" | "generate" | "interrupt" | "reset";
  messages?: Array<TransformersJSMessage>;
  temperature?: number;
}

interface ConversationTransformersJSWorkerResponseLoading {
  id: string;
  status: "loading";
  statusText?: string;
}

interface ConversationTransformersJSWorkerResponseReady {
  id: string;
  status: "ready";
}

interface ConversationTransformersJSWorkerResponseTokenUpdate {
  id: string;
  status: "token_update";
  decodedTokens: string;
}

interface Stats {
  tps: number;
  tokens_generated: number;
  loading_time_ms: number;
  time_to_first_token_ms: number;
  encoding_duration_ms: number;
  decoding_duration_ms: number;
}

interface ConversationTransformersJSWorkerResponseComplete {
  id: string;
  status: "complete";
  statusText?: string;
  messages: Array<TransformersJSMessage>;
  stats?: Stats;
}

interface ConversationTransformersJSWorkerResponseError {
  id: string;
  status: "error";
  error: string;
}

export type ConversationTransformersJSWorkerResponse =
  | ConversationTransformersJSWorkerResponseLoading
  | ConversationTransformersJSWorkerResponseReady
  | ConversationTransformersJSWorkerResponseTokenUpdate
  | ConversationTransformersJSWorkerResponseComplete
  | ConversationTransformersJSWorkerResponseError;

export interface TransformersJSMessage {
  role: "system" | "user" | "assistant";
  content: string;
  hidden?: boolean;
}
