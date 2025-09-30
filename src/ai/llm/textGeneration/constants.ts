interface ModelDefinition {
  id: string;
  dtype:
    | "auto"
    | "fp32"
    | "fp16"
    | "q8"
    | "int8"
    | "uint8"
    | "q4"
    | "bnb4"
    | "q4f16";
  expectedFiles: Record<string, number>;
  maxToken: number;
  maxNewTokens: number; // todo: I think this does not depend on the model but on the device.
}

export type ModelIds = "Qwen3-4B" | "SmolLM3-3B" /*| "Gemma3-270m"*/;

export const MODELS: Record<ModelIds, ModelDefinition> = {
  "SmolLM3-3B": {
    id: "HuggingFaceTB/SmolLM3-3B-ONNX",
    dtype: "q4f16",
    expectedFiles: {
      "tokenizer.json": 11574059,
      "tokenizer_config.json": 56256,
      "config.json": 2056,
      "onnx/model_q4f16.onnx": 301534,
      "generation_config.json": 182,
      "onnx/model_q4f16.onnx_data": 2124320768,
    },
    maxToken: 10000,
    maxNewTokens: 1500,
  },
  "Qwen3-4B": {
    id: "onnx-community/Qwen3-4B-ONNX",
    dtype: "q4f16",
    expectedFiles: {
      "tokenizer.json": 9117040,
      "tokenizer_config.json": 9761,
      "config.json": 1780,
      "onnx/model_q4f16.onnx": 59762833,
      "generation_config.json": 219,
      "onnx/model_q4f16.onnx_data_1": 677150720,
      "onnx/model_q4f16.onnx_data": 2096005120,
    },
    maxToken: 10000,
    maxNewTokens: 1500,
  },
  /*"Gemma3-270m": {
    id: "onnx-community/gemma-3-270m-it-ONNX",
    dtype: "fp32",
    expectedFiles: {
      "config.json": 1612,
      "tokenizer_config.json": 1158469,
      "tokenizer.json": 20323106,
      "generation_config.json": 172,
      "onnx/model.onnx": 201742,
      "onnx/model.onnx_data": 1139501568,
    },
    maxToken: 10000,
    maxNewTokens: 1500,
  },
  "Gemma3-270m-q4f16": {
    id: "onnx-community/gemma-3-270m-it-ONNX",
    dtype: "q4f16",
    expectedFiles: {
      "config.json": 1612,
      "tokenizer_config.json": 1158469,
      "tokenizer.json": 20323106,
      "generation_config.json": 172,
      "onnx/model_q4f16.onnx": 330642,
      "onnx/model_q4f16.onnx_data": 425724416,
    },
    maxToken: 10000,
    maxNewTokens: 1500,
  },*/
};
