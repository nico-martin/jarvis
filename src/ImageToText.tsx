import {
  AutoModelForVision2Seq,
  AutoProcessor,
  InterruptableStoppingCriteria,
  TextStreamer,
  load_image,
  pipeline,
} from "@huggingface/transformers";
import { Button } from "@theme";

export default function ImageToText() {
  const onClick = async () => {
    const image = await fetch("./nico-martin-portrait-small.jpg");
    const blob = await image.blob();

    console.log("IMAGE BLOB", blob);
    const model_id = "HuggingFaceTB/SmolVLM-256M-Instruct";

    const processor = await AutoProcessor.from_pretrained(model_id);
    const model = await AutoModelForVision2Seq.from_pretrained(model_id, {
      dtype: "fp32",
      device: "webgpu",
    });
    const loadedImage = await load_image(blob);
    console.log("LOADED IMAGE", loadedImage);
    console.log("processor", processor);
    console.log("model", model);

    const messages = [
      {
        role: "user",
        content: [
          { type: "image", image: loadedImage },
          { type: "text", text: "who is in the picture?" },
        ],
      },
    ];

    // @ts-ignore
    const text = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    console.log("text", text);

    const inputs = await processor(text, [loadedImage], {
      // Set `do_image_splitting: true` to split images into multiple patches.
      // NOTE: This uses more memory, but can provide more accurate results.
      // do_image_splitting: false,
    });

    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
    });

    const MAX_NEW_TOKENS = 1024;
    const stopping_criteria = new InterruptableStoppingCriteria();

    console.log(stopping_criteria);

    // @ts-ignore
    const { past_key_values, sequences } = await model.generate({
      ...inputs,
      // past_key_values: past_key_values_cache,

      // Sampling
      do_sample: false,
      repetition_penalty: 1.1,
      // top_k: 3,
      // temperature: 0.2,

      max_new_tokens: MAX_NEW_TOKENS,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });

    console.log({ past_key_values, sequences });

    const decoded = processor.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    console.log("DECODED", decoded);
  };

  return (
    <div className="absolute z-20">
      <p className="text-text">ImageToText</p>
      <Button onClick={onClick}>test</Button>
    </div>
  );
}
