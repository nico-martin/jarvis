import {
  ProgressCallback,
  TextGenerationPipeline,
  pipeline,
} from "@huggingface/transformers";

import { MODEL, ModelIds } from "../../../constants";

class CausalLMPipeline {
  static pipeline: Partial<Record<ModelIds, TextGenerationPipeline>> = {};

  static async getInstance(
    model_id: ModelIds,
    progress_callback: ProgressCallback = null,
    abortSignal?: AbortSignal
  ): Promise<TextGenerationPipeline> {
    if (!this.pipeline || !this.pipeline[model_id]) {
      this.pipeline[model_id] = await pipeline("text-generation", MODEL, {
        dtype: "auto",
        device: "webgpu",
        ...(progress_callback && { progress_callback }),
        ...(abortSignal && { signal: abortSignal }),
      });
    }
    return this.pipeline[model_id];
  }
}

export default CausalLMPipeline;
