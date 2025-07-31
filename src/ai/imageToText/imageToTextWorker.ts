import {
  AutoModelForVision2Seq,
  AutoProcessor,
  InterruptableStoppingCriteria,
  TextStreamer,
  load_image,
} from "@huggingface/transformers";

const MAX_NEW_TOKENS = 512;

interface ImageToTextWorkerMessage {
  type: "check" | "load" | "generate" | "interrupt" | "reset";
  data?: {
    id: string;
    image: string; // base64 data URL
    prompt?: string;
  };
}

interface ImageToTextWorkerResponse {
  id?: string;
  status: "loading" | "ready" | "start" | "update" | "complete" | "error";
  output?: string;
  error?: string;
  tps?: number;
  numTokens?: number;
}

/**
 * Helper function to perform feature detection for WebGPU
 */
let fp16_supported = false;
async function check() {
  try {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU is not supported");
    }
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
    fp16_supported = adapter.features.has("shader-f16");

    self.postMessage({
      status: "ready",
    } as ImageToTextWorkerResponse);
  } catch (e: any) {
    self.postMessage({
      status: "error",
      error: e.toString(),
    } as ImageToTextWorkerResponse);
  }
}

/**
 * This class uses the Singleton pattern to enable lazy-loading of the pipeline
 */
class SmolVLM {
  static model_id = "HuggingFaceTB/SmolVLM-256M-Instruct";
  static processor: Promise<any> | null = null;
  static model: Promise<any> | null = null;

  static async getInstance(progress_callback: any = null) {
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
      self.postMessage({
        id,
        status: "update",
        output,
        tps: tps!,
        numTokens,
      } as ImageToTextWorkerResponse);
    };

    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    // Tell the main thread we are starting
    self.postMessage({
      id,
      status: "start",
    } as ImageToTextWorkerResponse);

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
    self.postMessage({
      id,
      status: "complete",
      output: decoded[0] || "",
    } as ImageToTextWorkerResponse);
  } catch (error) {
    console.error("Image to text error:", error);
    self.postMessage({
      id,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    } as ImageToTextWorkerResponse);
  }
}

async function load() {
  self.postMessage({
    status: "loading",
  } as ImageToTextWorkerResponse);

  try {
    // Load the pipeline and save it for future use.
    await SmolVLM.getInstance((x: any) => {
      // We also add a progress callback to the pipeline so that we can
      // track model loading.
      self.postMessage(x);
    });

    self.postMessage({
      status: "ready",
    } as ImageToTextWorkerResponse);
  } catch (error) {
    self.postMessage({
      status: "error",
      error: error instanceof Error ? error.message : "Failed to load model",
    } as ImageToTextWorkerResponse);
  }
}

// Listen for messages from the main thread
self.addEventListener(
  "message",
  async (e: MessageEvent<ImageToTextWorkerMessage>) => {
    const { type, data } = e.data;

    switch (type) {
      case "check":
        await check();
        break;

      case "load":
        await load();
        break;

      case "generate":
        if (data) {
          stopping_criteria.reset();
          await generate(data);
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
