import { Message, ProgressInfo } from "@huggingface/transformers";
import { ModelIds } from "../../constants";

interface BaseRequest {
  id: string;
  type: RequestType;
  model_id: ModelIds;
  session_id: string;
}

interface BaseResponse {
  id: string;
  type: ResponseType;
}

export enum RequestType {
  CHECK_AVAILABILITY,
  LOAD_MODEL,
  PROMPT,
  CANCEL,
  DESTROY,
}

export enum ResponseType {
  ERROR,
  AVAILABILITY,
  LOAD_MODEL_PROGRESS,
  MODEL_LOADED,
  PROMPT_DONE,
  PROMPT_PROGRESS,
  CANCELLED,
}

/**
 * Request Types
 */

interface CheckAvailabilityRequest extends BaseRequest {
  type: RequestType.CHECK_AVAILABILITY;
}

interface LoadModelRequest extends BaseRequest {
  type: RequestType.LOAD_MODEL;
}

interface PromptRequest extends BaseRequest {
  type: RequestType.PROMPT;
  messages: Array<Message>;
  temperature: number;
  top_k: number;
  is_init_cache: boolean;
}

interface CancelRequest extends BaseRequest {
  type: RequestType.CANCEL;
}

interface DestroyRequest extends BaseRequest {
  type: RequestType.DESTROY;
}

/**
 * Response Types
 */

interface AvailabilityResponse extends BaseResponse {
  type: ResponseType.AVAILABILITY;
  availability: Availability;
}

interface ModelLoadingProgressResponse extends BaseResponse {
  type: ResponseType.LOAD_MODEL_PROGRESS;
  progress: ProgressInfo;
}

interface ModelLoadedResponse extends BaseResponse {
  type: ResponseType.MODEL_LOADED;
}

interface PromptProgressResponse extends BaseResponse {
  type: ResponseType.PROMPT_PROGRESS;
  token_generated: string;
}

interface PromptDoneResponse extends BaseResponse {
  type: ResponseType.PROMPT_DONE;
  response: string;
  messages: Array<Message>;
  usage: ModelUsage;
}

export interface ErrorResponse extends BaseResponse {
  type: ResponseType.ERROR;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

interface PromptCancelledResponse extends BaseResponse {
  type: ResponseType.CANCELLED;
  message: string;
}

export type WorkerRequest =
  | CheckAvailabilityRequest
  | LoadModelRequest
  | PromptRequest
  | CancelRequest
  | DestroyRequest;

export type WorkerResponse =
  | AvailabilityResponse
  | ErrorResponse
  | ModelLoadedResponse
  | ModelLoadingProgressResponse
  | PromptProgressResponse
  | PromptDoneResponse
  | PromptCancelledResponse;

export interface ModelUsage {
  new_input_tokens: number;
  input_tokens: number;
  input_duration_ms: number;
  input_cache_used: boolean;
  output_tokens: number;
  output_duration_ms: number;
  output_tps: number;
  total_tokens: number;
  model_id: ModelIds;
}
