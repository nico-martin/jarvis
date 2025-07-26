export enum VoiceActivityDetectionStatus {
  IDLE = "idle",
  WAITING = "waiting",
  RECORDING = "recording",
}

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

const STATUS_CHANGE_EVENT_KEY = "STATUS_CHANGE_EVENT_KEY";

class VoiceActivityDetection extends EventTarget {
  private worker: Worker;
  private callbacks: VadCallbacks = {};
  private isReady = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _status = VoiceActivityDetectionStatus.IDLE;

  public get status() {
    return this._status;
  }

  private set status(newStatus: VoiceActivityDetectionStatus) {
    this._status = newStatus;
    this.dispatchEvent(new Event(STATUS_CHANGE_EVENT_KEY));
  }

  public onStatusChange = (
    callback: (status: VoiceActivityDetectionStatus) => void
  ) => {
    const listener = () => callback(this.status);
    this.addEventListener(STATUS_CHANGE_EVENT_KEY, listener);
    return () => this.removeEventListener(STATUS_CHANGE_EVENT_KEY, listener);
  };

  constructor(callbacks: VadCallbacks = {}) {
    super();
    this.callbacks = callbacks;
    this.worker = new Worker(new URL("./vadWorker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", this.handleWorkerMessage);
  }

  public preload(): void {
    this.worker.postMessage({ type: "init" } as VadWorkerMessage);
  }

  private handleWorkerMessage = (event: MessageEvent<VadWorkerResponse>) => {
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
}

export default VoiceActivityDetection;
