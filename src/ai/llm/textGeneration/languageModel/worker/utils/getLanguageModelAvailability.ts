/// <reference types="@webgpu/types" />
import { ModelRegistry } from "@huggingface/transformers";

import { MODELS, ModelIds } from "../../../constants";
import isFileInCache from "./isFileInCache";

const getLanguageModelAvailability = async (
  model_id: ModelIds
): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || !(model_id in MODELS)) {
    return "unavailable";
  }

  const filesInCache = await ModelRegistry.is_pipeline_cached(
    "text-generation",
    MODELS[model_id].id,
    {
      dtype: MODELS[model_id].dtype,
    }
  );

  console.log("getLanguageModelAvailability", filesInCache, MODELS[model_id]);

  return filesInCache ? "available" : "downloadable";
};

export default getLanguageModelAvailability;
