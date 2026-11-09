import {
  AutoConfig,
  AutoTokenizer,
  PreTrainedModel,
  ProgressCallback,
  Tensor,
} from "@huggingface/transformers";

import { MODEL_ID, MODEL_URL_BASE, SAMPLE_RATE } from "./constants";

// Use the model graphs directly until the Phonon pipeline lands in Transformers.js
// (PRs #1811 and #1825). Follows the generation loop of PR #1825 against the
// current graphs: `model` emits eight 80 ms latents per call, and `mimi_decoder`
// turns all latents of a text chunk into 24 kHz audio in one call.
export const PHONON_MODEL = MODEL_ID;
export const PHONON_SAMPLE_RATE = SAMPLE_RATE;
const REPO_URL = MODEL_URL_BASE.replace(/\/$/, "");
const VOICE_CACHE = "phonon-voices";

export type PhononVoice = {
  filename: string;
  name: string;
  voice_id: string;
  locale: string;
  gender: string;
  description: string;
};

export async function loadVoices(): Promise<PhononVoice[]> {
  const response = await fetch(`${REPO_URL}/voices/voices.jsonl`);
  if (!response.ok) throw new Error("Could not load the voice list.");
  return (await response.text())
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

type State = Record<string, Tensor>;
type PhononConfig = {
  num_hidden_layers: number;
  num_key_value_heads: number;
  head_dim: number;
  latent_dim: number;
  audio_prompt_dim: number;
  frame_rate: number;
  eos_threshold: number;
};
// From the model's generation_config.json and processor_config.json.
const TEMPERATURE = 0.3;
const FRAMES_AFTER_EOS = 1;
const FRAMES_AFTER_EOS_SHORT_TEXT = 3;
const SHORT_TEXT_MAX_WORDS = 4;
const MAX_TOKENS_PER_CHUNK = 50;

const f32 = (dims: number[], data?: Float32Array) =>
  new Tensor(
    "float32",
    data ?? new Float32Array(dims.reduce((a, b) => a * b, 1)),
    dims
  );
const i64 = (values: number[], dims: number[]) =>
  new Tensor("int64", BigInt64Array.from(values, BigInt), dims);
const range = (start: number, length: number) =>
  Array.from({ length }, (_, i) => start + i);
const dispose = (state: State) =>
  Object.values(state).forEach((t) => t.dispose());
const randn = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) *
  Math.cos(2 * Math.PI * Math.random());

// Voice files are fetched outside of Transformers.js, so cache them ourselves.
async function fetchVoice(url: string): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(VOICE_CACHE);
    const cached = await cache.match(url);
    if (cached) return await cached.arrayBuffer();
  } catch {
    cache = null;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not download the voice.");
  if (cache) await cache.put(url, response.clone()).catch(() => {});
  return await response.arrayBuffer();
}

export async function createPhonon(
  device: "webgpu" | "cpu" = "webgpu",
  progress_callback?: ProgressCallback
) {
  const config = await AutoConfig.from_pretrained(PHONON_MODEL, {
    progress_callback,
  });
  const cfg = config as unknown as PhononConfig;
  const cacheNames = range(0, cfg.num_hidden_layers).flatMap((i) => [
    `present.${i}.key`,
    `present.${i}.value`,
  ]);
  // Keep everything that only goes back into a graph on the GPU (KV cache and
  // latents); only the EOS logits and the final audio return to the CPU.
  const onGpu = (names: string[]) =>
    device === "webgpu"
      ? {
          session_options: {
            preferredOutputLocation: Object.fromEntries(
              names.map((name) => [name, "gpu-buffer" as const])
            ),
          },
        }
      : {};
  const tokenizer = await AutoTokenizer.from_pretrained(PHONON_MODEL, {
    progress_callback,
  });
  const unigram = tokenizer._tokenizer.model;
  if (!unigram) throw new Error("The model tokenizer is unavailable.");
  const flow = await PreTrainedModel.from_pretrained(PHONON_MODEL, {
    config,
    model_file_name: "model",
    // q4: 4-bit weights, fp32 activations. The q4f16 graph fails on the
    // ONNX Runtime Web version bundled with Transformers.js 4.2 (fp16 QuickGelu).
    dtype: "q4",
    device,
    progress_callback,
    ...onGpu([...cacheNames, "present.audio_latents", "audio_latents"]),
  });
  let mimi: PreTrainedModel;
  try {
    mimi = await PreTrainedModel.from_pretrained(PHONON_MODEL, {
      config,
      model_file_name: "mimi_decoder",
      dtype: "fp16",
      device,
      progress_callback,
    });
  } catch (error) {
    await flow.dispose();
    throw error;
  }

  // Unigram byte fallback is not applied by Transformers.js 4.2 yet.
  if (!(unigram as unknown as { byte_fallback?: boolean }).byte_fallback) {
    const encodePieces = unigram.encode.bind(unigram);
    unigram.encode = (tokens: string[]) =>
      encodePieces(tokens).flatMap((piece: string) => {
        if (unigram.tokens_to_ids.has(piece)) return [piece];
        const bytes = Array.from(
          new TextEncoder().encode(piece),
          (b) => `<0x${b.toString(16).toUpperCase().padStart(2, "0")}>`
        );
        return bytes.every((b) => unigram.tokens_to_ids.has(b))
          ? bytes
          : [piece];
      });
  }
  // The tokenizer's normalizer capitalizes the text and adds the final period.
  const encode = (text: string) =>
    tokenizer.encode(text, { add_special_tokens: false });

  // Sentences, grouped into chunks of at most 50 tokens (as PocketTTSProcessor).
  function splitText(text: string) {
    const sentences = (text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .flatMap((sentence) =>
        encode(sentence).length > MAX_TOKENS_PER_CHUNK
          ? sentence.split(/(?<=[,;:])\s+/)
          : [sentence]
      );
    const chunks: string[] = [];
    let chunk = "";
    for (const sentence of sentences) {
      const joined = chunk ? `${chunk} ${sentence}` : sentence;
      if (chunk && encode(joined).length > MAX_TOKENS_PER_CHUNK) {
        chunks.push(chunk);
        chunk = sentence;
      } else {
        chunk = joined;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  // Voices are raw float32 data in [1, 512, frames] order; the graph takes
  // [1, frames, 512]. Each voice is downloaded once.
  const voices = new Map<string, Promise<Tensor>>();
  function loadVoice(voiceId: string) {
    let voice = voices.get(voiceId);
    if (!voice) {
      voice = (async () => {
        const data = new Float32Array(
          await fetchVoice(`${REPO_URL}/voices/${voiceId}.bin`)
        );
        const dim = cfg.audio_prompt_dim;
        return new Tensor("float32", data, [dim, data.length / dim])
          .transpose(1, 0)
          .unsqueeze(0);
      })();
      voice.catch(() => voices.delete(voiceId));
      voices.set(voiceId, voice);
    }
    return voice;
  }

  // One text chunk: run the generator in blocks of eight frames until the EOS
  // logit crosses the threshold, then decode all frames with one Mimi call.
  async function generateChunk(
    text: string,
    voice: Tensor,
    signal: AbortSignal
  ) {
    const ids = encode(text);
    const words = text.split(/\s+/).length;
    const tail =
      words <= SHORT_TEXT_MAX_WORDS
        ? FRAMES_AFTER_EOS_SHORT_TEXT
        : FRAMES_AFTER_EOS;
    const maxFrames = Math.ceil((ids.length / 3 + 2) * cfg.frame_rate);
    let past: State = Object.fromEntries(
      range(0, cfg.num_hidden_layers).flatMap((i) =>
        ["key", "value"].map((kind) => [
          `past_key_values.${i}.${kind}`,
          f32([1, cfg.num_key_value_heads, 0, cfg.head_dim]),
        ])
      )
    );
    past["past_key_values.audio_latents"] = f32([1, 0, cfg.latent_dim]);
    let prompt: State = {
      input_ids: i64(ids, [1, ids.length]),
      audio_prompt_latents: voice,
    };
    let pastLength = 0;
    // All frames so far, ready for the decoder (unlike the feedback state).
    let audioLatents: Tensor | null = null;
    let frames = 0;
    let stopFrame: number | null = null;
    try {
      while (frames < Math.min(stopFrame ?? maxFrames, maxFrames)) {
        if (signal.aborted) return null;
        const block = 8;
        // New positions: the voice, the text and the eight frames of this block.
        const newLength =
          prompt.input_ids.dims[1] +
          prompt.audio_prompt_latents.dims[1] +
          block;
        const noise = f32(
          [1, block, cfg.latent_dim],
          Float32Array.from(
            { length: block * cfg.latent_dim },
            () => randn() * Math.sqrt(TEMPERATURE)
          )
        );
        const step: State = {
          ...prompt,
          attention_mask: i64(new Array(pastLength + newLength).fill(1), [
            1,
            pastLength + newLength,
          ]),
          position_ids: i64(range(pastLength, newLength), [1, newLength]),
          noise,
        };
        let outputs: State;
        try {
          outputs = (await flow({ ...step, ...past })) as State;
        } finally {
          dispose(
            Object.fromEntries(
              Object.entries(step).filter(([, tensor]) => tensor !== voice)
            )
          );
        }
        dispose(past);
        past = Object.fromEntries(
          Object.entries(outputs)
            .filter(([name]) => name.startsWith("present"))
            .map(([name, value]) => [
              name.replace("present.", "past_key_values."),
              value,
            ])
        );
        pastLength += newLength;
        if (stopFrame === null) {
          const eos = Array.from(
            outputs.eos_logits.data as Float32Array
          ).findIndex((logit) => logit > cfg.eos_threshold);
          if (eos !== -1) stopFrame = frames + eos + tail + 1;
        }
        outputs.eos_logits.dispose();
        audioLatents?.dispose();
        audioLatents = outputs.audio_latents;
        frames += block;
        prompt = {
          input_ids: i64([], [1, 0]),
          audio_prompt_latents: f32([1, 0, cfg.audio_prompt_dim]),
        };
      }
      if (signal.aborted) return null;
      const numFrames = Math.min(frames, stopFrame ?? maxFrames, maxFrames);
      const numFramesTensor = i64([numFrames], [1]);
      const decoded = (await mimi({
        audio_latents: audioLatents!,
        num_frames: numFramesTensor,
      })) as State;
      numFramesTensor.dispose();
      const length = Number(decoded.audio_lengths.data[0]);
      const audio = (decoded.audio_values.data as Float32Array).slice(
        0,
        length
      );
      dispose(decoded);
      return audio;
    } finally {
      dispose(past);
      audioLatents?.dispose();
    }
  }

  return {
    splitText,
    loadVoice,
    // Returns the complete audio for `text`, one text chunk after the other.
    async speak(text: string, voiceId: string, signal: AbortSignal) {
      const chunks = splitText(text.trim());
      if (!chunks.length) throw new Error("Enter a sentence first.");
      const voice = await loadVoice(voiceId);
      const parts: Float32Array[] = [];
      for (const chunk of chunks) {
        const audio = await generateChunk(chunk, voice, signal);
        if (!audio) return null;
        parts.push(audio);
      }
      const audio = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
      parts.reduce((offset, p) => (audio.set(p, offset), offset + p.length), 0);
      return audio;
    },
    async dispose() {
      for (const voice of voices.values())
        await voice.then((t) => t.dispose()).catch(() => {});
      await Promise.all([flow.dispose(), mimi.dispose()]);
    },
  };
}
