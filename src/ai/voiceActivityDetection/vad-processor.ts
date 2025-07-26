declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: typeof AudioWorkletProcessor
): void;

class VadProcessor extends AudioWorkletProcessor {
  private bufferSize: number;
  private buffer: Float32Array;
  private bufferIndex: number;

  constructor() {
    super();
    this.bufferSize = 512; // Process in 512 sample chunks
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];

    if (input.length > 0) {
      const inputChannel = input[0]; // Get first channel

      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;

        if (this.bufferIndex >= this.bufferSize) {
          // Send buffer to main thread when full
          this.port.postMessage({
            buffer: this.buffer.slice(), // Copy the buffer
          });

          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor("vad-processor", VadProcessor);
