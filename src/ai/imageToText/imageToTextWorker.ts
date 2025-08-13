import {
  AutoModelForVision2Seq,
  AutoProcessor,
  InterruptableStoppingCriteria,
  ProgressInfo,
  TextStreamer,
  load_image,
} from "@huggingface/transformers";

import { ImageToTextWorkerMessage, ImageToTextWorkerResponse } from "./types";

const MAX_NEW_TOKENS = 512;

/**
 * Helper function to perform feature detection for WebGPU
 */
let fp16_supported = false;
async function check() {
  try {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU is not supported");
    }
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
    fp16_supported = adapter.features.has("shader-f16");

    postMessage({
      status: "ready",
    });
  } catch (e: any) {
    postMessage({
      status: "error",
      error: e.toString(),
    });
  }
}

/**
 * This class uses the Singleton pattern to enable lazy-loading of the pipeline
 */
class SmolVLM {
  static model_id = "HuggingFaceTB/SmolVLM-256M-Instruct";
  static processor: Promise<any> | null = null;
  static model: Promise<any> | null = null;

  static async getInstance(
    progress_callback: (progress: ProgressInfo) => void = null
  ) {
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= AutoModelForVision2Seq.from_pretrained(this.model_id, {
      dtype: fp16_supported ? "fp16" : "fp32",
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.processor, this.model]);
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();

let past_key_values_cache: any = null;

async function generate(data: { id: string; image: string; prompt?: string }) {
  const { id, image, prompt = "Describe this image in detail." } = data;

  try {
    // Retrieve the processor and model
    const [processor, model] = await SmolVLM.getInstance();

    // Load the image
    const loadedImage = await load_image(image);

    // Prepare the message format for SmolVLM
    const messages = [
      {
        role: "user",
        content: [
          { type: "image", image: loadedImage },
          { type: "text", text: prompt },
        ],
      },
    ];

    // Prepare inputs
    const text = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    const inputs = await processor(text, [loadedImage]);

    let startTime: number | undefined;
    let numTokens = 0;
    let tps: number | undefined;

    const token_callback_function = (_tokens: any) => {
      startTime ??= performance.now();
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime!)) * 1000;
      }
    };

    const callback_function = (output: string) => {
      postMessage({
        id,
        status: "update",
        output,
        tps: tps!,
        numTokens,
      });
    };

    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    // Tell the main thread we are starting
    postMessage({
      id,
      status: "start",
    });

    const { past_key_values, sequences } = await model.generate({
      ...inputs,
      do_sample: false,
      repetition_penalty: 1.1,
      max_new_tokens: MAX_NEW_TOKENS,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });

    past_key_values_cache = past_key_values;

    const decoded = processor.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    // Send the output back to the main thread
    postMessage({
      id,
      status: "complete",
      output: decoded[0] || "",
    });
  } catch (error) {
    console.error("Image to text error:", error);
    postMessage({
      id,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

async function load() {
  postMessage({
    status: "loading",
  });

  try {
    await SmolVLM.getInstance((progress) => {
      postMessage({
        status: "loading",
        progress,
      });
    });

    postMessage({
      status: "ready",
    });
  } catch (error) {
    postMessage({
      status: "error",
      error: error instanceof Error ? error.message : "Failed to load model",
    });
  }
}

// Listen for messages from the main thread
self.addEventListener(
  "message",
  async (e: MessageEvent<ImageToTextWorkerMessage>) => {
    const { type } = e.data;

    switch (type) {
      case "check":
        await check();
        break;

      case "load":
        await load();
        break;

      case "generate":
        if (e.data.data) {
          stopping_criteria.reset();
          await generate(e.data.data);
        }
        break;

      case "interrupt":
        stopping_criteria.interrupt();
        break;

      case "reset":
        past_key_values_cache = null;
        stopping_criteria.reset();
        break;
    }
  }
);

const postMessage = (message: ImageToTextWorkerResponse) =>
  self.postMessage(message);
