import { DynamicCache, ProgressInfo } from "@huggingface/transformers";

import {
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";
import CausalLMPipeline from "./worker/utils/CausalLMPipeline";
import { WorkerError, WorkerErrorCode } from "./worker/utils/WorkerError";
import getLanguageModelAvailability from "./worker/utils/getLanguageModelAvailability";
import prompt from "./worker/utils/prompt";

const cache = new Map<string, DynamicCache>();
const activePromptRequests = new Map<string, AbortController>();
const activeModelLoadRequests = new Map<string, AbortController>();

const webWorkerHandler = () => {
  const postMessage = (message: WorkerResponse) => self.postMessage(message);

  return {
    onmessage: async (event: MessageEvent<WorkerRequest>) => {
      const request = event.data;

      try {
        switch (request.type) {
          case RequestType.CHECK_AVAILABILITY: {
            postMessage({
              id: request.id,
              type: ResponseType.AVAILABILITY,
              availability: await getLanguageModelAvailability(
                request.model_id
              ),
            });
            return;
          }
          case RequestType.LOAD_MODEL: {
            const abortController = new AbortController();
            activeModelLoadRequests.set(request.id, abortController);

            await CausalLMPipeline.getInstance(
              request.model_id,
              (progressInfo: ProgressInfo) => {
                if (abortController.signal.aborted) {
                  throw new DOMException("Request cancelled", "AbortError");
                }
                postMessage({
                  id: request.id,
                  type: ResponseType.LOAD_MODEL_PROGRESS,
                  progress: progressInfo,
                });
              },
              abortController.signal
            );

            activeModelLoadRequests.delete(request.id);
            postMessage({
              id: request.id,
              type: ResponseType.MODEL_LOADED,
            });

            return;
          }
          case RequestType.PROMPT: {
            const abortController = new AbortController();
            activePromptRequests.set(request.id, abortController);
            let sessionCache = cache.get(request.session_id);
            if (!sessionCache) {
              sessionCache = new DynamicCache();
              cache.set(request.session_id, sessionCache);
            }
            const model = await CausalLMPipeline.getInstance(
              request.model_id,
              (progressInfo: ProgressInfo) => {
                // Check if request was cancelled
                if (abortController.signal.aborted) {
                  throw new DOMException("Request cancelled", "AbortError");
                }
                postMessage({
                  id: request.id,
                  type: ResponseType.LOAD_MODEL_PROGRESS,
                  progress: progressInfo,
                });
              },
              abortController.signal
            );

            const resp = await prompt({
              model,
              messages: request.messages,
              tools: request.tools,
              past_key_values: sessionCache,
              on_response_update: (token_generated: string) => {
                // Check if request was cancelled
                if (abortController.signal.aborted) {
                  throw new DOMException("Request cancelled", "AbortError");
                }
                postMessage({
                  id: request.id,
                  type: ResponseType.PROMPT_PROGRESS,
                  token_generated,
                });
              },
              temperature: request.temperature,
              top_k: request.top_k,
              is_init_cache: request.is_init_cache,
              model_id: request.model_id,
              abortSignal: abortController.signal,
            });

            activePromptRequests.delete(request.id);
            postMessage({
              id: request.id,
              type: ResponseType.PROMPT_DONE,
              response: resp.answer,
              messages: resp.newMessages,
              usage: resp.usage,
            });

            return;
          }
          case RequestType.CANCEL: {
            // Check for active prompt request
            const promptAbortController = activePromptRequests.get(request.id);
            if (promptAbortController) {
              promptAbortController.abort();
              activePromptRequests.delete(request.id);
              postMessage({
                id: request.id,
                type: ResponseType.CANCELLED,
                message: "Prompt request cancelled successfully",
              });
              return;
            }

            // Check for active model load request
            const modelAbortController = activeModelLoadRequests.get(
              request.id
            );
            if (modelAbortController) {
              modelAbortController.abort();
              activeModelLoadRequests.delete(request.id);
              postMessage({
                id: request.id,
                type: ResponseType.CANCELLED,
                message: "Model loading cancelled successfully",
              });
              return;
            }

            // No active request found
            const cancelError = new WorkerError(
              WorkerErrorCode.NO_HANDLER,
              `No active request found with id: ${request.id}`
            );
            postMessage(cancelError.toErrorResponse(request.id));
            return;
          }
          case RequestType.DESTROY: {
            const sessionCache = cache.get(request.session_id);
            if (sessionCache) {
              await sessionCache.dispose();
              cache.delete(request.session_id);
            }
            return;
          }
          default:
            const noHandlerError = new WorkerError(
              WorkerErrorCode.NO_HANDLER,
              // @ts-expect-error
              `No handler found for request type: ${request.type}`
            );
            // @ts-expect-error
            postMessage(noHandlerError.toErrorResponse(request.id));
        }
      } catch (error) {
        const workerError = WorkerError.fromError(
          error,
          WorkerErrorCode.HANDLER_ERROR
        );
        postMessage(workerError.toErrorResponse(request.id));
      }
    },
  };
};

export default webWorkerHandler;
