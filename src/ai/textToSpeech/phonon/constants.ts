import { ModelRegistry } from "@huggingface/transformers";

export const MODEL_ID = "onnx-community/phonon-31m-en-ONNX";
export const MODEL_URL_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
export const SAMPLE_RATE = 24000;

// Edwin: English (UK), male, middle-aged. "Efficient and firm, sincere in
// attention, with tidy articulation" – the closest match to Jarvis.
export const DEFAULT_VOICE = "zUCxzrOrugTSis03";

export async function getModelFiles(): Promise<string[]> {
  const files = await Promise.all([
    ModelRegistry.get_tokenizer_files(MODEL_ID),
    ModelRegistry.get_model_files(MODEL_ID, {
      device: "webgpu",
      model_file_name: "model",
      dtype: "q4",
    }),
    ModelRegistry.get_model_files(MODEL_ID, {
      device: "webgpu",
      model_file_name: "mimi_decoder",
      dtype: "fp16",
    }),
  ]);
  return [...new Set(files.flat())];
}
