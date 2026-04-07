import { Message, ModelRegistry } from "@huggingface/transformers";

import { MODELS, MODEL_ID, ModelIds } from "../constants";
import {
  ModelUsage,
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";

let workerRequestId = 0;

class TransformersJsModel {
  private model_id: ModelIds;
  private worker: Worker;
  private session_id: string;

  public constructor(
    worker: Worker,
    session_id: string,
    model_id: ModelIds = "SmolLM3-3B"
  ) {
    this.model_id = model_id;
    if (worker) {
      this.worker = worker;
    } else {
      throw new Error("No worker provided");
    }
    this.session_id = session_id;
  }

  private postMessage = (message: WorkerRequest) => {
    try {
      this.worker.postMessage(message);
    } catch (e) {
      console.error(e);
    }
  };

  public get maxToken() {
    return MODELS[this.model_id].maxToken;
  }

  public get downloadSize(): number {
    return MODELS[this.model_id].size;
  }

  public async loadModel(
    monitor?: CreateMonitor,
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }

    const updateProgress = (progress: {
      progress: number;
      loaded: number;
      total: number;
    }) => {
      if (monitor) {
        const event = new ProgressEvent("downloadprogress", {
          lengthComputable: true,
          loaded: progress.progress,
          total: progress.total,
        });

        if (monitor.ondownloadprogress) {
          monitor.ondownloadprogress.call(monitor, event);
        }
        monitor.dispatchEvent(event);
      }
    };

    return new Promise<void>((resolve, reject) => {
      const requestId = (workerRequestId++).toString();
      const filesMap: Record<string, number> = {};

      const total = MODELS[this.model_id].size;
      let refProgressPercentages = 0;

      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;

        if (
          e.data.type === ResponseType.ERROR ||
          e.data.type === ResponseType.CANCELLED
        ) {
          this.worker.removeEventListener("message", listener);
          reject(
            e.data.type === ResponseType.ERROR ? e.data.error : e.data.message
          );
        }

        if (e.data.type === ResponseType.MODEL_LOADED) {
          this.worker.removeEventListener("message", listener);
          resolve();
        }

        if (
          e.data.type === ResponseType.LOAD_MODEL_PROGRESS &&
          e.data.progress.status === "progress"
        ) {
          const progress = e.data.progress;
          filesMap[progress.file] = progress.loaded;
          const loaded = Object.values(filesMap).reduce(
            (acc, loaded) => acc + loaded,
            0
          );
          const newProgressPercentages =
            Math.round((loaded / total) * 10000) / 10000;
          const newProgress = {
            progress: newProgressPercentages,
            loaded,
            total,
          };
          if (
            JSON.stringify(refProgressPercentages) !==
            JSON.stringify(newProgressPercentages)
          ) {
            updateProgress(newProgress);
            refProgressPercentages = newProgressPercentages;
          }
        }
      };

      this.worker.addEventListener("message", listener);

      this.postMessage({
        id: requestId,
        type: RequestType.LOAD_MODEL,
        model_id: this.model_id,
        session_id: this.session_id,
      });

      if (signal) {
        signal.onabort = () => {
          this.postMessage({
            id: requestId,
            type: RequestType.CANCEL,
            model_id: this.model_id,
            session_id: this.session_id,
          });
        };
      }
    });
  }

  async prompt(
    input: Array<LanguageModelMessage | LanguageModelSystemMessage>,
    temperature: number,
    top_k: number,
    is_init_cache: boolean,
    onResponseUpdate: (response: string) => void = () => {},
    options?: LanguageModelPromptOptions
  ): Promise<{
    response: string;
    messages: Array<Message>;
    usage: ModelUsage;
  }> {
    return new Promise((resolve, reject) => {
      const requestId = (workerRequestId++).toString();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;

        if (
          e.data.type === ResponseType.ERROR ||
          e.data.type === ResponseType.CANCELLED
        ) {
          this.worker.removeEventListener("message", listener);
          reject(
            e.data.type === ResponseType.ERROR ? e.data.error : e.data.message
          );
        }

        if (e.data.type === ResponseType.PROMPT_PROGRESS) {
          onResponseUpdate(e.data.token_generated);
        }

        if (e.data.type === ResponseType.PROMPT_DONE) {
          this.worker.removeEventListener("message", listener);
          resolve({
            response: e.data.response,
            messages: e.data.messages,
            usage: e.data.usage,
          });
        }
      };

      this.worker.addEventListener("message", listener);

      this.postMessage({
        id: requestId,
        type: RequestType.PROMPT,
        messages: input.map((message) => ({
          role: message.role,
          content: message.content.toString(),
        })),
        temperature,
        top_k,
        is_init_cache,
        model_id: this.model_id,
        session_id: this.session_id,
      });

      if (options?.signal) {
        options.signal.onabort = () => {
          this.postMessage({
            id: requestId,
            type: RequestType.CANCEL,
            model_id: this.model_id,
            session_id: this.session_id,
          });
        };
      }
    });
  }

  async destroy() {
    const requestId = (workerRequestId++).toString();
    this.postMessage({
      id: requestId,
      type: RequestType.DESTROY,
      model_id: this.model_id,
      session_id: this.session_id,
    });
  }

  async availability(): Promise<Availability> {
    return new Promise((resolve, reject) => {
      const requestId = (workerRequestId++).toString();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;
        this.worker.removeEventListener("message", listener);

        if (e.data.type === ResponseType.ERROR) {
          reject(e.data.error);
        }

        if (e.data.type === ResponseType.AVAILABILITY) {
          resolve(e.data.availability);
        } else {
          resolve("unavailable");
        }
      };

      this.worker.addEventListener("message", listener);

      this.postMessage({
        id: requestId,
        type: RequestType.CHECK_AVAILABILITY,
        model_id: MODEL_ID,
        session_id: this.session_id,
      });
    });
  }

  static downloadSize = (model_id: ModelIds) => {
    return MODELS[model_id].size;
  };
}

export default TransformersJsModel;
