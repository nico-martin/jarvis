import {
  AutoTokenizer,
  PreTrainedModel,
  PreTrainedTokenizer,
  RawAudio,
  StyleTextToSpeech2Model,
  Tensor,
} from "@huggingface/transformers";

import phonemize from "./phonemize";
import { WorkerRequestKokoro, WorkerResponseKokoro } from "./types";
import { VOICES, getVoiceData } from "./voices";

const STYLE_DIM = 256;
const SAMPLE_RATE = 24000;
const postMessage = (e: WorkerResponseKokoro) => self.postMessage(e);
const onMessage = (cb: (e: MessageEvent<WorkerRequestKokoro>) => void) =>
  self.addEventListener("message", cb);

class ModelInstance {
  private static instance: ModelInstance = null;
  private tokenizer: PreTrainedTokenizer;
  private model: PreTrainedModel;
  private modelId: string = "onnx-community/Kokoro-82M-v1.0-ONNX";

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ModelInstance();
    }
    return this.instance;
  }

  public loadModel = async (
    log: () => void
  ): Promise<{
    tokenizer: PreTrainedTokenizer;
    model: PreTrainedModel;
  }> => {
    if (this.tokenizer && this.model) {
      return {
        tokenizer: this.tokenizer,
        model: this.model,
      };
    }
    const tokenizerPromise = AutoTokenizer.from_pretrained(this.modelId, {
      progress_callback: log,
    });

    const modelPromise = StyleTextToSpeech2Model.from_pretrained(this.modelId, {
      dtype: "fp32",
      device: "webgpu",
      progress_callback: log,
    });

    const [tokenizer, model] = await Promise.all([
      tokenizerPromise,
      modelPromise,
    ]);

    this.tokenizer = tokenizer;
    this.model = model;
    return {
      tokenizer: this.tokenizer,
      model: this.model,
    };
  };
}

onMessage(async (event) => {
  const instance = ModelInstance.getInstance();
  const log = (...e: Array<any>) =>
    event.data.log ? console.log("[WORKER]", ...e) : null;

  postMessage({ status: "loading", id: event.data.id });
  const { model, tokenizer } = await instance.loadModel(log);
  const voice = event.data?.input?.voice || "af";
  const speed = event.data?.input?.speed || 1;
  const text = event.data.input.text;
  if (!VOICES.hasOwnProperty(voice)) {
    log(`Voice "${voice}" not found. Available voices:`);
    throw new Error(
      `Voice "${voice}" not found. Should be one of: ${Object.keys(VOICES).join(", ")}.`
    );
  }

  if (!event.data.input.text) {
    log("no input");
    postMessage({
      status: "complete",
      output: null,
      id: event.data.id,
    });
    return;
  }

  try {
    const language = /** @type {"a"|"b"} */ voice.at(0); // "a" or "b"
    const phonemes = await phonemize(text, language);
    const { input_ids } = tokenizer(phonemes, {
      truncation: true,
    });

    // Select voice style based on number of input tokens
    const numTokens = Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), 509);

    const data = await getVoiceData(voice);
    const offset = numTokens * STYLE_DIM;
    const voiceData = data.slice(offset, offset + STYLE_DIM);

    postMessage({
      status: "ready",
      id: event.data.id,
    });

    const inputs = {
      input_ids,
      style: new Tensor("float32", voiceData, [1, STYLE_DIM]),
      speed: new Tensor("float32", [speed], [1]),
    };

    // Generate audio
    const { waveform } = await model(inputs);
    const audio = new RawAudio(waveform.data, SAMPLE_RATE);
    const blob = audio.toBlob();

    log("complete", blob);
    postMessage({
      status: "complete",
      output: blob,
      id: event.data.id,
    });
  } catch (error) {
    log("ERROR", error);
    postMessage({
      status: "error",
      error: error,
      id: event.data.id,
    });
  }
});
