import {
  SpeechToTextWorkerMessage,
  SpeechToTextWorkerResponse,
} from "@ai/speechToText/types";

class SpeechToText {
  private worker: Worker;
  private id: number = 0;

  constructor() {
    this.worker = new Worker(
      new URL("./speechToTextWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );
  }

  public preload(): void {
    // Send a small dummy audio buffer to initialize the model
    const dummyAudio = new Float32Array(16000); // 1 second of silence at 16kHz
    this.generate(dummyAudio, 16000).catch(() => {
      // Ignore errors during preload - this is just to initialize the model
    });
  }

  public async generate(
    audioData: Float32Array,
    sampleRate: number = 16000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = (this.id++).toString();

      const listener = (e: MessageEvent<SpeechToTextWorkerResponse>) => {
        if (e.data.id !== id) return;

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
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    let audioData = audioBuffer.getChannelData(0);
    if (audioBuffer.sampleRate !== 16000) {
      audioData = this.resampleAudio(audioData, audioBuffer.sampleRate, 16000);
    }

    return {
      data: audioData,
      sampleRate: 16000,
    };
  }

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
