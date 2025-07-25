class SequentialAudioPlayer {
  private queue: Array<{ blob: Blob; signal: AbortSignal }> = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  public play(audioBlob: Blob, signal?: AbortSignal): void {
    if (signal?.aborted) return;

    this.queue.push({
      blob: audioBlob,
      signal: signal || new AbortController().signal,
    });

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    // Filter out aborted items
    this.queue = this.queue.filter((item) => !item.signal.aborted);

    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;

    try {
      await this.playBlob(item.blob, item.signal);
    } catch (error) {
      console.error("Error playing audio:", error);
    }

    this.playNext();
  }

  private playBlob(blob: Blob, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Operation aborted", "AbortError"));
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = document.createElement("audio");

      audio.src = audioUrl;
      this.currentAudio = audio;

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        signal.removeEventListener("abort", abortHandler);
      };

      const abortHandler = () => {
        audio.pause();
        cleanup();
        reject(new DOMException("Operation aborted", "AbortError"));
      };

      signal.addEventListener("abort", abortHandler, { once: true });

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = (error) => {
        cleanup();
        reject(error);
      };

      audio.play().catch(reject);
    });
  }
}

export default SequentialAudioPlayer;
