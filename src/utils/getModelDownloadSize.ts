import { ModelRegistry } from "@huggingface/transformers";

export default async function getModelDownloadSize(
  modelId: string,
  files: string[]
): Promise<number> {
  const metadata = await Promise.all(
    [...new Set(files)].map((file) =>
      ModelRegistry.get_file_metadata(modelId, file)
    )
  );
  return metadata.reduce(
    (size, file) => size + (file.exists ? file.size : 0),
    0
  );
}
