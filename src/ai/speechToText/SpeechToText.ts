import {
  SpeechToTextWorkerMessage,
  SpeechToTextWorkerResponse,
} from "@ai/speechToText/types";
import isPipelineCached from "@utils/isPipelineCached";

import { MODEL } from "./constants";

class SpeechToText {
  private worker: Worker;
  private id: number = 0;

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  }

  public async preload(
    callback: (progress: number) => void = () => {}
  ): Promise<void> {
    // Run 1 second of silence to download the model and compile the shaders.
    try {
      await this.generate(new Float32Array(16000), 16000, callback);
    } catch (error) {
      // Don't block loading the other models, the error surfaces on first use.
      console.error("Speech to text preload failed:", error);
    }
  }

  public async generate(
    audioData: Float32Array,
    sampleRate: number = 16000,
    progressCallback: (progress: number) => void = () => {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = (this.id++).toString();

      const listener = (e: MessageEvent<SpeechToTextWorkerResponse>) => {
        if (e.data.id !== id) return;

        if (e.data.status === "progress") {
          if (e.data.progress.status === "progress_total") {
            progressCallback(Math.round(e.data.progress.progress));
          }
        }

        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          resolve(e.data.text || "");
        }

        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          reject(new Error(e.data.error || "Speech to text failed"));
        }
      };

      this.worker.addEventListener("message", listener);

      this.worker.postMessage(
        {
          id,
          audioData,
          sampleRate,
        } as SpeechToTextWorkerMessage,
        [audioData.buffer]
      );
    });
  }

  public async generateFromBlob(audioBlob: Blob): Promise<string> {
    const audioData = await this.processAudioBlob(audioBlob);
    return this.generate(audioData.data, audioData.sampleRate);
  }

  private async processAudioBlob(
    blob: Blob
  ): Promise<{ data: Float32Array; sampleRate: number }> {
    const arrayBuffer = await blob.arrayBuffer();
    // The VAD records 16-bit mono PCM WAV, which we read directly instead of
    // going through an AudioContext.
    const decoded =
      this.parsePcm16Wav(arrayBuffer) ??
      (await this.decodeWithAudioContext(arrayBuffer));
    const data =
      decoded.sampleRate === 16000
        ? decoded.data
        : this.resampleAudio(decoded.data, decoded.sampleRate, 16000);
    return { data, sampleRate: 16000 };
  }

  private parsePcm16Wav(
    buffer: ArrayBuffer
  ): { data: Float32Array; sampleRate: number } | null {
    const view = new DataView(buffer);
    const tag = (offset: number) =>
      String.fromCharCode(
        ...new Uint8Array(
          buffer,
          offset,
          Math.min(4, buffer.byteLength - offset)
        )
      );
    if (buffer.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE")
      return null;

    let sampleRate = 0;
    let offset = 12;
    while (offset + 8 <= buffer.byteLength) {
      const id = tag(offset);
      const size = view.getUint32(offset + 4, true);
      const body = offset + 8;
      if (id === "fmt ") {
        const format = view.getUint16(body, true);
        const channels = view.getUint16(body + 2, true);
        const bitsPerSample = view.getUint16(body + 14, true);
        if (format !== 1 || channels !== 1 || bitsPerSample !== 16) return null;
        sampleRate = view.getUint32(body + 4, true);
      } else if (id === "data" && sampleRate) {
        const length = Math.min(size, buffer.byteLength - body) >> 1;
        const data = new Float32Array(length);
        for (let i = 0; i < length; i++) {
          data[i] = view.getInt16(body + i * 2, true) / 32768;
        }
        return { data, sampleRate };
      }
      offset = body + size + (size & 1);
    }
    return null;
  }

  private async decodeWithAudioContext(
    buffer: ArrayBuffer
  ): Promise<{ data: Float32Array; sampleRate: number }> {
    const audioContext = new AudioContext();
    try {
      const audioBuffer = await audioContext.decodeAudioData(buffer);
      return {
        data: audioBuffer.getChannelData(0),
        sampleRate: audioBuffer.sampleRate,
      };
    } finally {
      void audioContext.close();
    }
  }

  public isCached = async (): Promise<boolean> =>
    isPipelineCached("automatic-speech-recognition", MODEL.id, {
      device: "webgpu",
      dtype: MODEL.dtype,
    });

  private resampleAudio(
    audioData: Float32Array,
    originalSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    const ratio = originalSampleRate / targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originalIndex = i * ratio;
      const leftIndex = Math.floor(originalIndex);
      const rightIndex = Math.ceil(originalIndex);
      const fraction = originalIndex - leftIndex;

      if (rightIndex < audioData.length) {
        result[i] =
          audioData[leftIndex] * (1 - fraction) +
          audioData[rightIndex] * fraction;
      } else {
        result[i] = audioData[leftIndex];
      }
    }

    return result;
  }
}

export default SpeechToText;
