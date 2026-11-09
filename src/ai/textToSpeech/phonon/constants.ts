export const MODEL_ID = "onnx-community/phonon-31m-en-ONNX";
export const MODEL_URL_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
export const SAMPLE_RATE = 24000;

// Edwin: English (UK), male, middle-aged. "Efficient and firm, sincere in
// attention, with tidy articulation" – the closest match to Jarvis.
export const DEFAULT_VOICE = "zUCxzrOrugTSis03";

export const EXPECTED_FILES = {
  "config.json": 5430,
  "tokenizer.json": 169734,
  "tokenizer_config.json": 1711,
  "onnx/model_q4.onnx": 283544,
  "onnx/model_q4.onnx_data": 28428288,
  "onnx/mimi_decoder_fp16.onnx": 33198,
  "onnx/mimi_decoder_fp16.onnx_data": 21835472,
};
