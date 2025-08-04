export interface ConversationTransformersJSWorkerMessage {
  id: string;
  type: "preload" | "generate" | "interrupt" | "reset";
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

interface ConversationTransformersJSWorkerResponseComplete {
  id: string;
  status: "complete";
  messages: Array<TransformersJSMessage>;
  stats: {
    tps: number;
    tokens_generated: number;
    encoding_duration_ms: number;
    decoding_duration_ms: number;
  };
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
}
