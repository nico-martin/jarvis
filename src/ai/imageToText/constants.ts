export const MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct";
export const MODEL_ONNX_URL_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main/`;

export const EXPECTED_FILES = {
  "preprocessor_config.json": 486,
  "config.json": 7353,
  "processor_config.json": 68,
  "tokenizer.json": 3548256,
  "tokenizer_config.json": 28249,
  "generation_config.json": 136,
  "onnx/embed_tokens_fp16.onnx": 56770946,
  "onnx/decoder_model_merged_fp16.onnx": 270414183,
  "onnx/vision_encoder_fp16.onnx": 187294693,
};
