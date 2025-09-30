/// <reference types="@webgpu/types" />
import isFileInCache from "./isFileInCache";
import { ModelIds, MODELS } from "../../../constants";

const getLanguageModelAvailability = async (
  model_id: ModelIds,
): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || !(model_id in MODELS)) {
    return "unavailable";
  }

  const filesInCache = await Promise.all(
    Object.keys(MODELS[model_id].expectedFiles).map((file) =>
      isFileInCache(
        "transformers-cache",
        `https://huggingface.co/${MODELS[model_id].id}/resolve/main/${file}`,
      ),
    ),
  );

  if (filesInCache.every((c) => c)) {
    return "available";
  }

  return "downloadable";
};

export default getLanguageModelAvailability;
