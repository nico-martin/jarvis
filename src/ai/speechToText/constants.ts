export type SpeechToTextModelKey = "moonshine" | "whisper";

// Which speech to text model Jarvis uses.
export const SPEECH_TO_TEXT_MODEL: SpeechToTextModelKey = "moonshine";

export type SpeechToTextModel = {
  id: string;
  name: string;
  url: string;
  dtype?: Record<string, string>;
  // Extra options passed to the pipeline call.
  generateOptions: (audio: Float32Array, sampleRate: number) => object;
  expectedFiles: Record<string, number>;
};

// Moonshine paper: greedy decoding with ~6 tokens per second of audio to avoid
// repetition loops. The pipeline floors the seconds, which gives 0 tokens for
// clips under a second, so we pass our own limit with a minimum.
const MOONSHINE_TOKENS_PER_SECOND = 6;
const MOONSHINE_MIN_NEW_TOKENS = 10;

export const SPEECH_TO_TEXT_MODELS: Record<
  SpeechToTextModelKey,
  SpeechToTextModel
> = {
  // Processes audio proportional to its length (Whisper always pads to 30s),
  // which makes it much faster for the short utterances coming from the VAD.
  moonshine: {
    id: "onnx-community/moonshine-base-ONNX",
    name: "Moonshine Base",
    url: "https://huggingface.co/UsefulSensors/moonshine-base",
    // fp32 encoder for accuracy, the 4-bit decoder is faster per token.
    dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
    generateOptions: (audio, sampleRate) => ({
      max_new_tokens: Math.max(
        MOONSHINE_MIN_NEW_TOKENS,
        Math.ceil((audio.length / sampleRate) * MOONSHINE_TOKENS_PER_SECOND)
      ),
    }),
    expectedFiles: {
      "config.json": 922,
      "generation_config.json": 147,
      "onnx/decoder_model_merged_q4.onnx": 72781828,
      "onnx/encoder_model.onnx": 80818781,
      "preprocessor_config.json": 128,
      "tokenizer.json": 3761754,
      "tokenizer_config.json": 135735,
    },
  },
  whisper: {
    id: "Xenova/whisper-base.en",
    name: "Whisper Base",
    url: "https://huggingface.co/openai/whisper-base",
    generateOptions: () => ({
      return_timestamps: false,
      chunk_length_s: 30,
      stride_length_s: 5,
    }),
    expectedFiles: {
      "config.json": 2202,
      "generation_config.json": 1500,
      "onnx/decoder_model_merged.onnx": 208558935,
      "onnx/encoder_model.onnx": 82474863,
      "preprocessor_config.json": 339,
      "tokenizer.json": 2128494,
      "tokenizer_config.json": 835,
    },
  },
};

export const MODEL = SPEECH_TO_TEXT_MODELS[SPEECH_TO_TEXT_MODEL];
export const MODEL_ID = MODEL.id;
export const MODEL_ONNX_URL_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
export const EXPECTED_FILES = MODEL.expectedFiles;
