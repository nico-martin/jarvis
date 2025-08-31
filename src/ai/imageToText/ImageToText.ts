import { ProgressInfo } from "@huggingface/transformers";
import isFileInCache from "@utils/isFileInCache";

import { EXPECTED_FILES, MODEL_ONNX_URL_BASE } from "./constants";
import { ImageToTextWorkerMessage, ImageToTextWorkerResponse } from "./types";

class ImageToText {
  private worker: Worker;
  private isReady: boolean = false;

  constructor() {
    this.worker = new Worker(
      new URL("./imageToTextWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    // Initialize worker
    this.worker.postMessage({ type: "check" });
  }

  public async preload(
    loadingCallback: (progress: number) => void = () => {}
  ): Promise<void> {
    const files: Record<
      string,
      {
        total: number;
        loaded: number;
      }
    > = Object.entries(EXPECTED_FILES).reduce(
      (acc, [file, total]) => ({
        ...acc,
        [file]: {
          total,
          loaded: 0,
        },
      }),
      {}
    );

    return new Promise((resolve, reject) => {
      const listener = (e: MessageEvent<ImageToTextWorkerResponse>) => {
        if (e.data.status === "ready") {
          this.isReady = true;
          loadingCallback(100);
          this.worker.removeEventListener("message", listener);
          resolve();
        }
        if (
          e.data.status === "loading" &&
          e.data.progress &&
          e.data.progress.status === "progress"
        ) {
          const progress = e.data.progress;
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
          loadingCallback(Math.round((loaded / total) * 100));
        }

        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          reject(new Error(e.data.error || "Failed to initialize"));
        }
      };

      this.worker.addEventListener("message", listener);
      this.postMessage({ type: "load" });
    });
  }

  public async generate(
    imageDataUrl: string,
    prompt: string = "Describe this image in detail.",
    onUpdate?: (partialText: string, tps?: number, numTokens?: number) => void
  ): Promise<string> {
    if (!this.isReady) {
      await this.preload();
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      let fullOutput = "";

      const listener = (e: MessageEvent<ImageToTextWorkerResponse>) => {
        if ("id" in e.data && e.data.id !== id) return;

        if (e.data.status === "start") {
          // Generation started
        }

        if (e.data.status === "update") {
          fullOutput = e.data.output || "";
          if (onUpdate) {
            onUpdate(fullOutput, e.data.tps, e.data.numTokens);
          }
        }

        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          resolve(e.data.output || fullOutput);
        }

        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          reject(new Error(e.data.error || "Image to text failed"));
        }
      };

      this.worker.addEventListener("message", listener);

      this.postMessage({
        type: "generate",
        data: {
          id,
          image: imageDataUrl,
          prompt,
        },
      });
    });
  }

  private postMessage = (message: ImageToTextWorkerMessage) =>
    this.worker.postMessage(message);

  public async generateFromBlob(
    imageBlob: Blob,
    prompt: string = "Describe this image in detail.",
    onUpdate?: (partialText: string, tps?: number, numTokens?: number) => void
  ): Promise<string> {
    const dataUrl = await this.blobToDataUrl(imageBlob);
    return this.generate(dataUrl, prompt, onUpdate);
  }

  public async generateFromFile(
    file: File,
    prompt: string = "Describe this image in detail.",
    onUpdate?: (partialText: string, tps?: number, numTokens?: number) => void
  ): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("File is not an image");
    }
    return this.generateFromBlob(file, prompt, onUpdate);
  }

  public async generateFromUrl(
    imageUrl: string,
    prompt: string = "Describe this image in detail.",
    onUpdate?: (partialText: string, tps?: number, numTokens?: number) => void
  ): Promise<string> {
    const blob = await this.urlToBlob(imageUrl);
    return this.generateFromBlob(blob, prompt, onUpdate);
  }

  public interrupt(): void {
    this.postMessage({ type: "interrupt" });
  }

  public reset(): void {
    this.postMessage({ type: "reset" });
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });
  }

  private async urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.blob();
  }

  public isCached = async (): Promise<boolean> => {
    return (
      await Promise.all(
        Object.keys(EXPECTED_FILES).map((file) =>
          isFileInCache("transformers-cache", MODEL_ONNX_URL_BASE + file)
        )
      )
    ).every((c) => c);
  };
}

export default ImageToText;
