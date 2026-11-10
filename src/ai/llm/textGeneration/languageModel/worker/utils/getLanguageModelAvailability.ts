/// <reference types="@webgpu/types" />
import isPipelineCached from "../../../../../../utils/isPipelineCached";

import { MODELS, ModelIds } from "../../../constants";

const getLanguageModelAvailability = async (
  model_id: ModelIds
): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || !(model_id in MODELS)) {
    return "unavailable";
  }

  const filesInCache = await isPipelineCached(
    "text-generation",
    MODELS[model_id].id,
    {
      dtype: MODELS[model_id].dtype,
    }
  );

  return filesInCache ? "available" : "downloadable";
};

export default getLanguageModelAvailability;
