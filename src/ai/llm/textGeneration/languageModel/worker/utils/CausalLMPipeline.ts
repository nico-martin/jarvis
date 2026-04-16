import {
  ProgressCallback,
  TextGenerationPipeline,
  pipeline,
} from "@huggingface/transformers";

import { MODELS, ModelIds } from "../../../constants";

class CausalLMPipeline {
  static pipeline: Partial<Record<ModelIds, TextGenerationPipeline>> = {};

  static async getInstance(
    model_id: ModelIds,
    progress_callback: ProgressCallback = null,
    abortSignal?: AbortSignal
  ): Promise<TextGenerationPipeline> {
    if (!(model_id in MODELS)) {
      throw new Error(
        `Model ${model_id} not found. Available models: ${Object.keys(MODELS).join(", ")}`
      );
    }
    const MODEL = MODELS[model_id];

    if (!this.pipeline || !this.pipeline[model_id]) {
      this.pipeline[model_id] = await pipeline("text-generation", MODEL.id, {
        dtype: MODEL.dtype,
        device: "webgpu",
        ...(progress_callback && { progress_callback }),
        ...(abortSignal && { signal: abortSignal }),
      });
    }
    return this.pipeline[model_id];
  }
}

export default CausalLMPipeline;
