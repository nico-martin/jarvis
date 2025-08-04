import { QWEN3_4B } from "@ai/llm/webLlm/constants";
import {
  AutoModelForCausalLM,
  AutoModelForVision2Seq,
  AutoProcessor,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
  load_image,
  pipeline,
} from "@huggingface/transformers";
import { CreateMLCEngine, CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { Button } from "@theme";

export default function TextGeneration() {
  const onClick = async () => {
    const message = "who are you?";
    const systemPrompt = "You are Jonny, a helpful assistant.";

    const webllm = await CreateMLCEngine(QWEN3_4B.model, {
      //initProgressCallback: console.log,
    });

    const conv = await webllm.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      extra_body: {
        enable_thinking: false,
      },
    });

    const fullReply = await webllm.getMessage();
    console.log("[NICO] WEBLLM resp:", fullReply);
    console.log("[NICO] WEBLLM usage", {
      decodingTps: conv.usage.extra.decode_tokens_per_s,
    });

    const model_id = "onnx-community/Qwen3-4B-ONNX";
    const tokenizer = await AutoTokenizer.from_pretrained(model_id, {
      //progress_callback: console.log,
    });

    const stopping_criteria = new InterruptableStoppingCriteria();

    const model = await AutoModelForCausalLM.from_pretrained(model_id, {
      dtype: "q4f16",
      device: "webgpu",
      //progress_callback: console.log,
    });

    let past_key_values_cache = null;

    const inputs = tokenizer.apply_chat_template(
      [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      {
        add_generation_prompt: true,
        return_dict: true,
        enable_thinking: false,
      }
    );

    const [START_THINKING_TOKEN_ID, END_THINKING_TOKEN_ID] = tokenizer.encode(
      "<think></think>",
      { add_special_tokens: false }
    );

    const reasonEnabled = false;

    let startTime: DOMHighResTimeStamp = null;
    let numTokens = 0;
    let decodingTps: number = 0;
    const token_callback_function = (tokens) => {
      startTime ??= performance.now();

      if (numTokens++ > 0) {
        decodingTps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      token_callback_function,
    });

    const { past_key_values, sequences } = await model.generate({
      ...inputs,
      past_key_values: past_key_values_cache,

      // Sampling
      do_sample: true,
      // repetition_penalty: 1.1,
      top_k: 20,
      temperature: reasonEnabled ? 0.6 : 0.7,

      max_new_tokens: 16384,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });
    past_key_values_cache = past_key_values;
    console.log(past_key_values_cache);

    const decoded = tokenizer.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    const decodedParts = decoded[0].split("\n");
    console.log("[NICO] TFJS resp:", decodedParts[decodedParts.length - 1]);
    console.log("[NICO] TFJS usage", {
      decodingTps,
    });
  };

  return (
    <div className="absolute z-20">
      <p className="text-text">ImageToText</p>
      <Button onClick={onClick}>test</Button>
    </div>
  );
}
