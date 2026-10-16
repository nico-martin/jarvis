/// <reference types="@webgpu/types" />
import { ModelRegistry } from "@huggingface/transformers";

import { MODEL, MODEL_ID, ModelIds } from "../../../constants";

const getLanguageModelAvailability = async (
  model_id: ModelIds
): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || model_id !== MODEL_ID) {
    return "unavailable";
  }

  const filesInCache = await ModelRegistry.is_pipeline_cached(
    "text-generation",
    MODEL,
    {
      device: "webgpu",
      dtype: "auto",
    }
  );

  return filesInCache ? "available" : "downloadable";
};

export default getLanguageModelAvailability;
