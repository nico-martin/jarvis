import { ModelRegistry } from "@huggingface/transformers";

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
  maxToken: number;
  size: number;
  maxNewTokens: number; // todo: I think this does not depend on the model but on the device.
}

export const MODEL_ID: ModelIds = "GPT-OSS-20B";

export type ModelIds =
  | "Qwen3-4B"
  | "SmolLM3-3B"
  | "GPT-OSS-20B" /*| "Gemma3-270m"*/;

export const MODELS: Record<ModelIds, ModelDefinition> = {
  "SmolLM3-3B": {
    id: "HuggingFaceTB/SmolLM3-3B-ONNX",
    dtype: "q4f16",
    maxToken: 10000,
    maxNewTokens: 1500,
    size: 2136254855,
  },
  "Qwen3-4B": {
    id: "onnx-community/Qwen3-4B-ONNX",
    dtype: "q4f16",
    maxToken: 10000,
    maxNewTokens: 1500,
    size: 2842047473,
  },
  "GPT-OSS-20B": {
    id: "onnx-community/gpt-oss-20b-ONNX",
    dtype: "q4f16",
    maxToken: 10000,
    maxNewTokens: 1500,
    size: 12651938001,
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

/*(() => {
  Promise.all(
    Object.values(MODELS).map(async (model) => {
      const files = await ModelRegistry.get_pipeline_files(
        "text-generation",
        model.id,
        {
          dtype: model.dtype,
        }
      );

      const metadata = await Promise.all(
        files.map(async (file) =>
          ModelRegistry.get_file_metadata(model.id, file)
        )
      );

      const downloadSize = metadata.reduce(
        (totalSize, metadata) => totalSize + metadata.size,
        0
      );

      console.log(model.id, downloadSize);
    })
  );
})();*/
