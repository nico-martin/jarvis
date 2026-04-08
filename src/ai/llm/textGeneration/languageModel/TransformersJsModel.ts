import type { XMLToolSignature } from "@ai/types";
import { Message, ModelRegistry } from "@huggingface/transformers";

import { MODELS, MODEL_ID, ModelIds } from "../constants";
import type { SerializableToolDefinition } from "./toolCalling/chatTemplateToolMapping";
import { getChatTemplateToolMapper } from "./toolCalling/chatTemplateToolMapping";
import {
  ModelUsage,
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";

let workerRequestId = 0;
const modelSizeCache: Partial<Record<ModelIds, number>> = {};

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

  public get downloadSize(): number {
    return TransformersJsModel.downloadSize(this.model_id);
  }

  static async resolveDownloadSize(model_id: ModelIds): Promise<number> {
    if (modelSizeCache[model_id] !== undefined) {
      return modelSizeCache[model_id];
    }

    const model = MODELS[model_id];
    const files = await ModelRegistry.get_pipeline_files(
      "text-generation",
      model.id,
      {
        dtype: model.dtype,
      }
    );

    const metadata = await Promise.all(
      files.map(async (file) => {
        try {
          return await ModelRegistry.get_file_metadata(model.id, file);
        } catch {
          return {
            exists: false,
            size: 0,
          };
        }
      })
    );

    const size = metadata.reduce(
      (acc, item) => acc + (item.exists ? item.size : 0),
      0
    );

    modelSizeCache[model_id] = size;
    return size;
  }

  public async loadModel(
    monitor?: CreateMonitor,
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }

    try {
      await TransformersJsModel.resolveDownloadSize(this.model_id);
    } catch {
      // Fallback to progress event totals when metadata lookup fails.
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
      const loadedMap: Record<string, number> = {};
      const totalMap: Record<string, number> = {};
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
          loadedMap[progress.file] = progress.loaded;
          if (progress.total > 0) {
            totalMap[progress.file] = progress.total;
          }
          const loaded = Object.values(loadedMap).reduce(
            (acc, loaded) => acc + loaded,
            0
          );

          const inferredTotal = Object.values(totalMap).reduce(
            (acc, total) => acc + total,
            0
          );

          const total =
            modelSizeCache[this.model_id] ?? inferredTotal ?? loaded ?? 1;

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
    tools?: Array<SerializableToolDefinition>,
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
        tools,
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
    return modelSizeCache[model_id] ?? 0;
  };

  parseToolCalls(response: string): Array<XMLToolSignature> {
    const mapper = getChatTemplateToolMapper(this.model_id);
    if (!mapper) {
      return [];
    }

    return mapper.parseToolCalls(response);
  }
}

export default TransformersJsModel;
