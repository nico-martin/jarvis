import { MODEL_ONNX_URL } from "@ai/voiceActivityDetection/constants";
import { ProgressInfo } from "@huggingface/transformers";
import isFileInCache from "@utils/isFileInCache";
import { data } from "autoprefixer";

import {
  VadCallbacks,
  VadWorkerMessage,
  VadWorkerResponse,
  VoiceActivityDetectionStatus,
} from "./types";
import workletUrl from "./vad-processor.ts?worker&url";

//const STATUS_CHANGE_EVENT_KEY = "STATUS_CHANGE_EVENT_KEY";

class VoiceActivityDetection {
  private worker: Worker;
  private callbacks: VadCallbacks = {};
  private isReady = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _status = VoiceActivityDetectionStatus.IDLE;
  private statusListener = new Set<
    (status: VoiceActivityDetectionStatus) => void
  >([]);
  private requestId: number = 0;

  public get status() {
    return this._status;
  }

  private set status(newStatus: VoiceActivityDetectionStatus) {
    this._status = newStatus;
    this.statusListener.forEach((listener) => listener(newStatus));
  }

  public onStatusChange = (
    callback: (status: VoiceActivityDetectionStatus) => void
  ) => {
    const listener = () => callback(this.status);
    this.statusListener.add(listener);
    return () => this.statusListener.delete(listener);
  };

  constructor(callbacks: VadCallbacks = {}) {
    this.callbacks = callbacks;
    // Use dynamic import for Vite compatibility
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", this.handleWorkerMessage);
  }

  public preload(
    progressCallback: (progress: number) => void = () => {}
  ): void {
    const id = (this.requestId++).toString();

    const listener = (message: MessageEvent<VadWorkerResponse>) => {
      if (message.data.id !== id) return;
      if (message.data.type === "ready") {
        this.worker.removeEventListener("message", listener);
      }

      if (
        message.data.type === "progress" &&
        message.data.progress.status === "progress" &&
        message.data.progress.file === "onnx/model.onnx"
      ) {
        progressCallback(Math.round(message.data.progress.progress));
      }
      if (
        message.data.type === "progress" &&
        message.data.progress.status === "done" &&
        message.data.progress.file === "onnx/model.onnx"
      ) {
        progressCallback(100);
      }
    };
    this.worker.addEventListener("message", listener);
    this.postMessage({ type: "init", id });
  }

  public isCached = async (): Promise<boolean> =>
    await isFileInCache("transformers-cache", MODEL_ONNX_URL);

  private handleWorkerMessage = (event: MessageEvent<VadWorkerResponse>) => {
    // @ts-ignore
    const { type, buffer, start, end, duration, error } = event.data;

    switch (type) {
      case "ready":
        this.isReady = true;
        break;

      case "speech_start":
        this.status = VoiceActivityDetectionStatus.RECORDING;
        this.callbacks.onSpeechStart?.();
        break;

      case "speech_end":
        this.status = VoiceActivityDetectionStatus.WAITING;
        this.callbacks.onSpeechEnd?.();
        break;

      case "speech_chunk":
        if (
          buffer &&
          start !== undefined &&
          end !== undefined &&
          duration !== undefined
        ) {
          this.callbacks.onSpeechChunk?.(buffer, { start, end, duration });
        }
        break;

      case "error":
        if (error) {
          this.callbacks.onError?.(error);
        }
        break;
    }
  };

  private handleWorkletMessage = (event: MessageEvent) => {
    const { buffer } = event.data;
    if (buffer && this.isReady) {
      this.postMessage(
        {
          type: "audio",
          buffer: buffer,
          id: (this.requestId++).toString(),
        },
        [buffer.buffer]
      );
    }
  };

  public async startMicrophone(): Promise<void> {
    if (this.status !== VoiceActivityDetectionStatus.IDLE) {
      console.warn("Microphone is already active");
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      await this.audioContext.audioWorklet.addModule(workletUrl);

      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "vad-processor"
      );
      this.workletNode.port.onmessage = this.handleWorkletMessage;

      this.sourceNode.connect(this.workletNode);

      this.status = VoiceActivityDetectionStatus.WAITING;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start microphone";
      this.callbacks.onError?.(errorMessage);
      throw error;
    }
  }

  public stopMicrophone(): void {
    if (this.status === VoiceActivityDetectionStatus.IDLE) {
      return;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.onmessage = null;
      this.workletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.status = VoiceActivityDetectionStatus.IDLE;
  }

  public processAudio(audioBuffer: Float32Array): void {
    if (!this.isReady) {
      console.warn("VAD not ready yet");
      return;
    }

    this.worker.postMessage(
      {
        type: "audio",
        buffer: audioBuffer,
      } as VadWorkerMessage,
      [audioBuffer.buffer]
    );
  }

  public reset(): void {
    this.postMessage({ type: "reset", id: (this.requestId++).toString() });
  }

  public setCallbacks(callbacks: VadCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public destroy(): void {
    this.stopMicrophone();
    this.worker.removeEventListener("message", this.handleWorkerMessage);
    this.worker.terminate();
  }

  public get ready(): boolean {
    return this.isReady;
  }

  private postMessage = (message: VadWorkerMessage, ...args: Array<any>) => {
    this.worker.postMessage(message, args);
  };
}

export default VoiceActivityDetection;
