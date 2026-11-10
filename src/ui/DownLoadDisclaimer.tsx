import { DownloadModelProgress } from "@ai/agentContext/AgentContext";
import useAgent from "@ai/agentContext/useAgent";
import {
  MODEL_ID as VLM_MODEL_ID,
  getModelDtype,
} from "@ai/imageToText/constants";
import { TextGeneration } from "@ai/llm/textGeneration";
import { MODEL, MODEL_ID } from "@ai/llm/textGeneration/constants";
import { MODEL as STT_MODEL } from "@ai/speechToText/constants";
import {
  MODEL_ID as TTS_MODEL_ID,
  getModelFiles as getTtsModelFiles,
} from "@ai/textToSpeech/phonon/constants";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { ModelRegistry } from "@huggingface/transformers";
import { Button, ContentBox, Loader, Progress } from "@theme";
import formatBytes from "@utils/formatBytes";
import getModelDownloadSize from "@utils/getModelDownloadSize";
import { useEffect, useState } from "preact/hooks";

TextGeneration.model_id = MODEL_ID;

const VAD_SIZE = 2243022;
type ModelSizes = Record<"llm" | "tts" | "stt" | "vlm", number>;

const getModel = (
  key: string,
  sizes: ModelSizes
): {
  taskName: string;
  name: string;
  size: number;
  url: string;
} => {
  switch (key) {
    case "vad":
      return {
        taskName: "VOICE_ACTIVITY_DETECTION",
        name: "Silero VAD",
        size: VAD_SIZE,
        url: "https://github.com/snakers4/silero-vad",
      };
    case "llm":
      return {
        taskName: "LARGE_LANGUAGE_MODEL",
        name: MODEL_ID,
        size: sizes.llm,
        url: `https://huggingface.co/${MODEL.modelId}`,
      };
    case "tts":
      return {
        taskName: "SPEECH_SYNTHESIS",
        name: "Phonon 31M",
        size: sizes.tts,
        url: "https://huggingface.co/onnx-community/phonon-31m-en-ONNX",
      };
    case "stt":
      return {
        taskName: "SPEECH_RECOGNITION",
        name: STT_MODEL.name,
        size: sizes.stt,
        url: STT_MODEL.url,
      };
    case "vlm":
      return {
        taskName: "VISION_LANGUAGE_MODEL",
        name: "SmolVLM 256M",
        size: sizes.vlm,
        url: "https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct",
      };
    default:
      return null;
  }
};

export default function DownLoadDisclaimer({}: {}) {
  const [sizes, setSizes] = useState<ModelSizes | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [sizeRequest, setSizeRequest] = useState(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { loadModels } = useAgent();
  const [progress, setProgress] = useState<DownloadModelProgress>({
    vad: 0,
    llm: 0,
    tts: 0,
    stt: 0,
    vlm: 0,
  });

  useEffect(() => {
    let active = true;
    setSizeError(false);
    const pendingSizes: Record<keyof ModelSizes, Promise<number>> = {
      llm: TextGeneration.resolveDownloadSize(),
      tts: (async () =>
        getModelDownloadSize(TTS_MODEL_ID, await getTtsModelFiles()))(),
      stt: (async () =>
        getModelDownloadSize(
          STT_MODEL.id,
          await ModelRegistry.get_pipeline_files(
            "automatic-speech-recognition",
            STT_MODEL.id,
            {
              device: "webgpu",
              dtype: STT_MODEL.dtype,
            }
          )
        ))(),
      vlm: (async () =>
        getModelDownloadSize(
          VLM_MODEL_ID,
          await ModelRegistry.get_pipeline_files(
            "image-to-text",
            VLM_MODEL_ID,
            {
              device: "webgpu",
              dtype: await getModelDtype(),
            }
          )
        ))(),
    };
    void Promise.all(
      Object.entries(pendingSizes).map(async ([model, pendingSize]) => {
        try {
          return [model, await pendingSize] as const;
        } catch (error) {
          console.error(`Failed to resolve ${model} download size:`, error);
          throw error;
        }
      })
    )
      .then((entries) => {
        if (active) setSizes(Object.fromEntries(entries) as ModelSizes);
      })
      .catch(() => {
        if (active) setSizeError(true);
      });
    return () => {
      active = false;
    };
  }, [sizeRequest]);

  const download = async () => {
    setIsDownloading(true);
    await loadModels((progress) => {
      setProgress(progress);
    });
    setIsDownloading(false);
  };

  if (sizeError) {
    return (
      <ContentBox className="space-y-4">
        <p>Could not fetch model download sizes. Please try again.</p>
        <Button onClick={() => setSizeRequest((request) => request + 1)}>
          Retry
        </Button>
      </ContentBox>
    );
  }

  if (!sizes) {
    return (
      <div
        className="mt-24 flex items-center justify-center"
        role="status"
        aria-label="Fetching model download sizes"
      >
        <Loader size={10} />
      </div>
    );
  }

  return (
    <div>
      <ContentBox className="space-y-4">
        <h3 className="text-sm font-medium">WELCOME_TO_JARVIS</h3>
        <p>
          Jarvis is a sophisticated AI agent that leverages cutting-edge
          on-device AI models and integrates seamlessly with various tools
          through the Model Context Protocol (MCP). Unlike cloud-dependent
          assistants, Jarvis operates locally on your device, ensuring privacy,
          speed, and reliability while providing intelligent assistance for your
          daily tasks.
        </p>
        <p>
          Everything runs entirely in your browser with{" "}
          <a
            className="underline"
            href="https://huggingface.co/docs/transformers.js/index"
          >
            Transformers.js
          </a>{" "}
          and an experimental WebGPU runtime, meaning no data is sent to a
          server. It can even run offline!
        </p>
        <div className="my-16 flex w-full items-center justify-center">
          {isDownloading ? (
            <ul className="w-full">
              {Object.entries(progress).map(([key, progress]) => {
                const model = getModel(key, sizes);
                return !model ? null : (
                  <li className="mt-6 flex w-full flex-col gap-2">
                    <p>
                      {model.taskName} - {progress}%
                      <br />
                      <span className="text-text-bright text-xs">
                        <a
                          className="underline"
                          target="_blank"
                          href={model.url}
                        >
                          {model.name}
                        </a>{" "}
                        ({formatBytes(model.size)})
                      </span>
                    </p>
                    <Progress value={progress} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Button
              iconLeft={<ArrowDownTrayIcon width="1.25em" />}
              onClick={download}
            >
              Download required models (≈{" "}
              {formatBytes(
                VAD_SIZE +
                  Object.values(sizes).reduce((total, size) => total + size, 0)
              )}
              )
            </Button>
          )}
        </div>
      </ContentBox>
    </div>
  );
}
