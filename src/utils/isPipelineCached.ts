import { ModelRegistry } from "@huggingface/transformers";

export default async function isPipelineCached(
  ...args: Parameters<typeof ModelRegistry.is_pipeline_cached_files>
): Promise<boolean> {
  return ModelRegistry.is_pipeline_cached(...args);
}
