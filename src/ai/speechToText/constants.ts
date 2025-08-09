export const MODEL_ID = "Xenova/whisper-base.en";

export const MODEL_ONNX_URL_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main/`;

export const EXPECTED_FILES = {
  "config.json": 2202,
  "generation_config.json": 1500,
  "onnx/decoder_model_merged.onnx": 208558935,
  "onnx/encoder_model.onnx": 82474863,
  "preprocessor_config.json": 339,
  "tokenizer.json": 2128494,
  "tokenizer_config.json": 835,
};
