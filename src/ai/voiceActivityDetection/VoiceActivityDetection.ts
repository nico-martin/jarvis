import { Message } from "@ai/types";

interface VadWorkerMessage {
  type: "init" | "audio" | "reset";
  buffer?: Float32Array;
}

interface VadWorkerResponse {
  type: "ready" | "speech_start" | "speech_end" | "speech_chunk" | "error";
  buffer?: Float32Array;
  start?: number;
  end?: number;
  duration?: number;
  error?: string;
}

interface VadCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechChunk?: (
    audioBuffer: Float32Array,
    timing: { start: number; end: number; duration: number }
  ) => void;
  onError?: (error: string) => void;
}

const RECORDING_EVENT_KEY = "RECORDING_EVENT_KEY";

class VoiceActivityDetection extends EventTarget {
  private worker: Worker;
  private callbacks: VadCallbacks = {};
  private isReady = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _isRecording = false;

  public get isRecording() {
    return this._isRecording;
  }

  public set isRecording(recording) {
    this._isRecording = recording;
    this.dispatchEvent(new Event(RECORDING_EVENT_KEY));
  }

  public onRecordingChange = (callback: (recording: boolean) => void) => {
    const listener = () => callback(this.recording);
    this.addEventListener(RECORDING_EVENT_KEY, listener);
    return () => this.removeEventListener(RECORDING_EVENT_KEY, listener);
  };

  constructor(callbacks: VadCallbacks = {}) {
    super();
    this.callbacks = callbacks;
    this.worker = new Worker(new URL("./vadWorker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", this.handleWorkerMessage);
    this.worker.postMessage({ type: "init" } as VadWorkerMessage);
  }

  private handleWorkerMessage = (event: MessageEvent<VadWorkerResponse>) => {
    const { type, buffer, start, end, duration, error } = event.data;

    switch (type) {
      case "ready":
        this.isReady = true;
        break;

      case "speech_start":
        this.callbacks.onSpeechStart?.();
        break;

      case "speech_end":
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
      this.worker.postMessage(
        {
          type: "audio",
          buffer: buffer,
        } as VadWorkerMessage,
        [buffer.buffer]
      );
    }
  };

  public async startMicrophone(): Promise<void> {
    if (this.isRecording) {
      console.warn("Microphone is already recording");
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

      await this.audioContext.audioWorklet.addModule(
        new URL("./vad-processor.ts", import.meta.url)
      );

      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "vad-processor"
      );
      this.workletNode.port.onmessage = this.handleWorkletMessage;

      this.sourceNode.connect(this.workletNode);

      this.isRecording = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start microphone";
      this.callbacks.onError?.(errorMessage);
      throw error;
    }
  }

  public stopMicrophone(): void {
    if (!this.isRecording) {
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

    this.isRecording = false;
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
    this.worker.postMessage({ type: "reset" } as VadWorkerMessage);
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

  public get recording(): boolean {
    return this.isRecording;
  }
}

export default VoiceActivityDetection;
