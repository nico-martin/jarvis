import { DataType } from "@huggingface/transformers";

interface ModelDefinition {
  id: string;
  dtype: DataType;
}

export const MODEL_ID: ModelIds = "Gemma4-E2B";

export type ModelIds = "Qwen3-4B" | "SmolLM3-3B" | "Gemma4-E2B" | "Gemma4-E4B";

export const MODELS: Record<ModelIds, ModelDefinition> = {
  "SmolLM3-3B": {
    id: "HuggingFaceTB/SmolLM3-3B-ONNX",
    dtype: "q4f16",
  },
  "Qwen3-4B": {
    id: "onnx-community/Qwen3-4B-ONNX",
    dtype: "q4f16",
  },
  "Gemma4-E2B": {
    id: "onnx-community/gemma-4-E2B-it-ONNX",
    dtype: "q4f16",
  },
  "Gemma4-E4B": {
    id: "onnx-community/gemma-4-E4B-it-ONNX",
    dtype: "q4f16",
  },
};
