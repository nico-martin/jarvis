export const MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct";
export const IMAGE_MAX_EDGE = 512;
export async function getModelDtype(): Promise<"fp16" | "fp32"> {
  const adapter = await navigator.gpu?.requestAdapter();
  return adapter?.features.has("shader-f16") ? "fp16" : "fp32";
}
