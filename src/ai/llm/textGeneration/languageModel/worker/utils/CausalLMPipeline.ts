import {
  AutoTokenizer,
  AutoModelForCausalLM,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressCallback,
} from "@huggingface/transformers";
import { ModelIds, MODELS } from "../../../constants";

class CausalLMPipeline {
  static tokenizer: Partial<Record<ModelIds, PreTrainedTokenizer>> = {};
  static model: Partial<Record<ModelIds, PreTrainedModel>> = {};

  static async getInstance(
    model_id: ModelIds,
    progress_callback: ProgressCallback = null,
    abortSignal?: AbortSignal,
  ): Promise<[PreTrainedTokenizer, PreTrainedModel]> {
    if (!(model_id in MODELS)) {
      throw new Error(
        `Model ${model_id} not found. Available models: ${Object.keys(MODELS).join(", ")}`,
      );
    }
    const MODEL = MODELS[model_id];

    if (
      !this.tokenizer ||
      !this.tokenizer[model_id] ||
      !this.model ||
      !this.model[model_id]
    ) {
      const tokenizer = AutoTokenizer.from_pretrained(MODEL.id, {
        progress_callback,
        ...(abortSignal && { signal: abortSignal }),
      });

      const model = AutoModelForCausalLM.from_pretrained(MODEL.id, {
        dtype: MODEL.dtype,
        device: "webgpu",
        progress_callback,
        ...(abortSignal && { signal: abortSignal }),
      });

      const loaded = await Promise.all([tokenizer, model]);

      this.tokenizer[model_id] = loaded[0];
      this.model[model_id] = loaded[1];
    }
    return [this.tokenizer[model_id], this.model[model_id]];
  }
}

export default CausalLMPipeline;
