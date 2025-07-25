import { TextToSpeech } from "../types";
import SequentialAudioPlayer from "./SequentialAudioPlayer";
import { KokoroInput, KokoroOutput, WorkerResponseKokoro } from "./types";

const WORKER_LOG = false;

class Kokoro implements TextToSpeech {
  private worker: Worker;
  private queue: Array<{ text: string; signal: AbortSignal }> = [];
  private isProcessing = false;
  private player = new SequentialAudioPlayer();

  constructor() {
    this.worker = new Worker(new URL("./kokoroWorker.ts", import.meta.url), {
      type: "module",
    });
  }

  public speak(text: string, signal?: AbortSignal): void {
    if (!text || text.trim() === "") return;
    if (signal?.aborted) return;

    this.queue.push({
      text: text.trim(),
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
        voice: "bm_daniel",
      },
      signal
    );

    if (signal.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }

    this.player.play(audioBlob, signal);
  }

  private workerMessage(
    input: KokoroInput,
    signal: AbortSignal
  ): Promise<KokoroOutput> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);

      const abortListener = () => {
        this.worker.removeEventListener("message", listener);
        reject(new DOMException("Operation aborted", "AbortError"));
      };

      if (signal.aborted) {
        reject(new DOMException("Operation aborted", "AbortError"));
        return;
      }

      signal.addEventListener("abort", abortListener, {
        once: true,
      });

      this.worker.postMessage({ input, id, log: WORKER_LOG });

      const listener = (e: MessageEvent<WorkerResponseKokoro>) => {
        if (e.data.id !== id) return;

        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          signal.removeEventListener("abort", abortListener);
          resolve(e.data.output);
        }

        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          signal.removeEventListener("abort", abortListener);
          reject(e.data);
        }
      };

      this.worker.addEventListener("message", listener);
    });
  }
}

export default Kokoro;
