import { ModelRegistry, ProgressInfo } from "@huggingface/transformers";

import { TextToSpeech } from "../types";
import SequentialAudioPlayer from "./SequentialAudioPlayer";
import {
  DEFAULT_VOICE,
  MODEL_ID,
  getModelFiles,
} from "./constants";
import { PhononInput, PhononOutput, WorkerResponsePhonon } from "./types";

const WORKER_LOG = false;

class Phonon implements TextToSpeech {
  private worker: Worker;
  private queue: Array<{ text: string; signal: AbortSignal }> = [];
  private isProcessing = false;
  public player = new SequentialAudioPlayer();
  private voice: string = DEFAULT_VOICE;

  constructor(options: { voice?: string } = {}) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    if (options?.voice) {
      this.voice = options.voice;
    }
  }

  public async preload(
    callback: (progress: number) => void = () => {}
  ): Promise<void> {
    const modelFiles = await getModelFiles();
    const metadata = await Promise.all(
      modelFiles.map((file) => ModelRegistry.get_file_metadata(MODEL_ID, file))
    );
    const files = Object.fromEntries(
      modelFiles.flatMap((file, index) =>
        metadata[index].exists
          ? [[file, { total: metadata[index].size, loaded: 0 }]]
          : []
      )
    );
    await this.workerMessage(
      {
        text: "",
        voice: this.voice,
      },
      (progress) => {
        if (progress.status === "progress") {
          files[progress.file] = {
            loaded: progress.loaded,
            total: progress.total,
          };
          const { total, loaded } = Object.entries(files).reduce(
            (acc, [file, progress]) => ({
              total: acc.total + progress.total,
              loaded: acc.loaded + progress.loaded,
            }),
            { total: 0, loaded: 0 }
          );
          callback(total > 0 ? Math.round((loaded / total) * 100) : 0);
        }
      }
    );
    callback(100);
  }

  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\*+/g, '') // Remove asterisks (markdown emphasis)
      .replace(/[_]{1,}/g, '') // Remove underscores (markdown emphasis)
      .replace(/[#]+/g, '') // Remove hashtags (markdown headers)
      .replace(/[`]+/g, '') // Remove backticks (markdown code)
      .replace(/[~]+/g, '') // Remove tildes (strikethrough)
      .replace(/[\[\]]/g, '') // Remove square brackets
      .replace(/[{}]/g, '') // Remove curly braces
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/[|]/g, '') // Remove pipe characters
      .replace(/[@#$%^&+=]/g, '') // Remove various symbols
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  public speak(text: string, signal?: AbortSignal): void {
    if (!text || text.trim() === "") return;
    if (signal?.aborted) return;

    this.queue.push({
      text: this.cleanTextForSpeech(text),
      signal: signal || new AbortController().signal,
    });

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private processNext(): void {
    this.queue = this.queue.filter((item) => !item.signal.aborted);

    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;

    this.processAndPlay(item.text, item.signal)
      .then(() => {
        // Process next item in queue
        this.processNext();
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          this.processNext();
          return;
        }
        console.error("Error processing TTS:", error);
        this.processNext();
      });
  }

  private async processAndPlay(
    text: string,
    signal: AbortSignal
  ): Promise<void> {
    if (signal.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }

    const audioBlob = await this.workerMessage(
      {
        text,
        voice: this.voice,
      },
      () => {},
      signal
    );

    if (signal.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }
    this.player.play(audioBlob, signal);
  }

  private workerMessage(
    input: PhononInput,
    loadingCallback: (progress: ProgressInfo) => void = () => {},
    signal?: AbortSignal
  ): Promise<PhononOutput> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);

      const abortListener = () => {
        this.worker.removeEventListener("message", listener);
        reject(new DOMException("Operation aborted", "AbortError"));
      };

      if (signal && signal.aborted) {
        reject(new DOMException("Operation aborted", "AbortError"));
        return;
      }

      signal &&
        signal.addEventListener("abort", abortListener, {
          once: true,
        });

      this.worker.postMessage({ input, id, log: WORKER_LOG });

      const listener = (e: MessageEvent<WorkerResponsePhonon>) => {
        if (e.data.id !== id) return;
        if (e.data.status === "loading") {
          loadingCallback(e.data.progress);
          return;
        }

        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          signal && signal.removeEventListener("abort", abortListener);
          resolve(e.data.output);
        }

        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          signal && signal.removeEventListener("abort", abortListener);
          reject(e.data);
        }
      };

      this.worker.addEventListener("message", listener);
    });
  }

  public isCached = async (): Promise<boolean> => {
    // Phonon loads two graphs and a tokenizer, but no processor. Let the
    // registry resolve cache keys, including versioned tokenizer assets.
    const graphs = [
      { model_file_name: "model", dtype: "q4" },
      { model_file_name: "mimi_decoder", dtype: "fp16" },
    ] as const;
    const results = await Promise.all(
      graphs.map((graph) => {
        const options = {
          ...graph,
          device: "webgpu" as const,
          include_processor: false,
        };
        return ModelRegistry.is_cached_files(MODEL_ID, options);
      })
    );
    return results.every((result) => result.allCached);
  };
}

export default Phonon;
