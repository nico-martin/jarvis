import {
  ConversationTransformersJSWorkerMessage,
  ConversationTransformersJSWorkerResponse,
  TransformersJSMessage,
} from "@ai/llm/tfjsLlm/types";
import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressCallback,
  Tensor,
  TextStreamer,
} from "@huggingface/transformers";

class TextGenerationPipeline {
  static model_id = "onnx-community/Qwen3-4B-ONNX"; //"HuggingFaceTB/SmolLM3-3B-ONNX";
  static tokenizer: Promise<PreTrainedTokenizer>;
  static model: Promise<PreTrainedModel>;

  static async getInstance(progress_callback: ProgressCallback = null) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.model]);
  }
}

const generateConversationHash = (
  messages: Array<TransformersJSMessage>
): string => {
  let hash = 5381;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const roleLen = msg.role.length;
    for (let j = 0; j < roleLen; j++) {
      hash = (hash * 33) ^ msg.role.charCodeAt(j);
    }
    const contentLen = msg.content.length;
    for (let j = 0; j < contentLen; j++) {
      hash = (hash * 33) ^ msg.content.charCodeAt(j);
    }
    hash = hash ^ (i << 16);
  }
  return (hash >>> 0).toString(36);
};

const stopping_criteria = new InterruptableStoppingCriteria();
const past_key_values_cache: Map<string, Record<string, Tensor>> = new Map();

async function generate({
  messages,
  temperature,
  id,
  isInitCache,
}: {
  messages: Array<TransformersJSMessage>;
  temperature: number;
  id: string;
  isInitCache?: boolean;
}) {
  postMessage({
    id,
    status: "loading",
    statusText: "Loading model...",
  });

  const started = performance.now();
  const [tokenizer, model] = await TextGenerationPipeline.getInstance();
  const loaded = performance.now();

  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
    // @ts-ignore
    enable_thinking: false,
  });

  const encodingStartTime: DOMHighResTimeStamp = performance.now();
  let decodingStartTime: DOMHighResTimeStamp = null;
  let numTokens = 0;
  let tps: number = 0;

  let answer = "";

  const token_callback_function = (tokens: number[] | bigint[] | Tensor) => {
    decodingStartTime ??= performance.now();

    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - decodingStartTime)) * 1000;
    }
  };

  const callback_function = (output: string) => {
    answer = answer + output;
    postMessage({
      id,
      status: "token_update",
      decodedTokens: output,
    });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  const cacheKey = generateConversationHash(messages.slice(0, -1));

  const kvCache = past_key_values_cache.get(cacheKey);

  // @ts-ignore
  const { past_key_values } = await model.generate({
    // @ts-ignore
    ...inputs,
    past_key_values: kvCache,

    // Sampling
    do_sample: true,
    // repetition_penalty: 1.1,
    top_k: 20,
    temperature,

    max_new_tokens: isInitCache ? 1 : 16384,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });

  const decodingEndTime: DOMHighResTimeStamp = performance.now();

  const newMessages: Array<TransformersJSMessage> = [
    ...messages,
    {
      role: "assistant",
      content: answer,
      hidden: isInitCache,
    },
  ];

  past_key_values_cache.set(
    generateConversationHash(newMessages),
    past_key_values
  );

  postMessage({
    id,
    status: "complete",
    messages: newMessages,
    stats: {
      tps,
      tokens_generated: numTokens,
      loading_time_ms: loaded - started,
      time_to_first_token_ms: decodingStartTime - loaded,
      encoding_duration_ms: decodingStartTime - encodingStartTime,
      decoding_duration_ms: decodingEndTime - decodingStartTime,
    },
  });
}

async function load(id: string) {
  postMessage({
    id,
    status: "loading",
    statusText: "Loading model...",
  });

  const [tokenizer, model] = await TextGenerationPipeline.getInstance((x) => {
    postMessage({
      id,
      status: "loading",
      statusText: "Loading model... " + JSON.stringify(x),
    });
  });

  postMessage({
    id,
    status: "loading",
    statusText: "Compiling shaders and warming up model...",
  });

  const inputs = tokenizer("a");
  await model.generate({ ...inputs, max_new_tokens: 1 });
  postMessage({
    id,
    status: "complete",
    messages: [],
  });
}

// Listen for messages from the main thread
self.addEventListener(
  "message",
  async (e: MessageEvent<ConversationTransformersJSWorkerMessage>) => {
    const { type, id, messages, temperature } = e.data;

    switch (type) {
      case "preload":
        load(id);
        break;

      case "initialize-cache":
        generate({ id, messages, temperature, isInitCache: true });
        break;

      case "generate":
        generate({ messages, temperature, id });
        break;
    }
  }
);

const postMessage = (message: ConversationTransformersJSWorkerResponse) =>
  self.postMessage(message);
