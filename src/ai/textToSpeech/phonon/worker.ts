import { ProgressInfo, RawAudio } from "@huggingface/transformers";

import { DEFAULT_VOICE, SAMPLE_RATE } from "./constants";
import { createPhonon } from "./engine";
import { WorkerRequestPhonon, WorkerResponsePhonon } from "./types";

type PhononEngine = Awaited<ReturnType<typeof createPhonon>>;

const postMessage = (e: WorkerResponsePhonon) => self.postMessage(e);
const onMessage = (cb: (e: MessageEvent<WorkerRequestPhonon>) => void) =>
  self.addEventListener("message", cb);

let engine: PhononEngine | null = null;

const loadEngine = async (progress: (progress: ProgressInfo) => void) => {
  if (!engine) engine = await createPhonon("webgpu", progress);
  return engine;
};

// Requests are handled one after the other, the engine is not reentrant.
let queue: Promise<void> = Promise.resolve();

onMessage((event) => {
  queue = queue.then(() => handle(event)).catch(() => {});
});

const handle = async (event: MessageEvent<WorkerRequestPhonon>) => {
  const { id } = event.data;
  const log = (...e: Array<any>) =>
    event.data.log ? console.log("[WORKER]", ...e) : null;

  try {
    const engine = await loadEngine((p) => {
      log(p);
      postMessage({ status: "loading", id, progress: p });
    });
    const voice = event.data.input?.voice || DEFAULT_VOICE;
    await engine.loadVoice(voice);

    const text = event.data.input?.text?.trim();
    if (!text) {
      log("no input");
      postMessage({ status: "complete", output: null, id });
      return;
    }

    postMessage({ status: "ready", id });

    const audio = await engine.speak(text, voice, new AbortController().signal);
    const blob = new RawAudio(audio, SAMPLE_RATE).toBlob();

    log("complete", blob);
    postMessage({ status: "complete", output: blob, id });
  } catch (error) {
    log("ERROR", error);
    postMessage({ status: "error", error, id });
  }
};
