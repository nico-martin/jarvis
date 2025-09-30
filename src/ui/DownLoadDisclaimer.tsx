import { DownloadModelProgress } from "@ai/agentContext/AgentContext";
import useAgent from "@ai/agentContext/useAgent";
import { EXPECTED_FILES as EXPECTED_FILES_VLM } from "@ai/imageToText/constants";
import Conversation from "@ai/llm/Conversation";
import { TextGeneration } from "@ai/llm/textGeneration";
import { EXPECTED_FILES as EXPECTED_FILES_STT } from "@ai/speechToText/constants";
import { EXPECTED_FILES as EXPECTED_FILES_TTS } from "@ai/textToSpeech/kokoro/constants";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { Button, ContentBox, Progress } from "@theme";
import formatBytes from "@utils/formatBytes";
import { useState } from "preact/hooks";

TextGeneration.model_id = "Qwen3-4B";

const VAD_SIZE = 2243022;
const LLM_SIZE = Conversation.downloadSize;
const TTS_SIZE = Object.values(EXPECTED_FILES_TTS).reduce(
  (acc, size) => acc + size,
  0
);
const STT_SIZE = Object.values(EXPECTED_FILES_STT).reduce(
  (acc, size) => acc + size,
  0
);
const VLM_SIZE = Object.values(EXPECTED_FILES_VLM).reduce(
  (acc, size) => acc + size,
  0
);

const getModel = (
  key: string
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
        name: "Qwen3 4B",
        size: LLM_SIZE,
        url: "https://github.com/snakers4/silero-vad",
      };
    case "tts":
      return {
        taskName: "SPEECH_SYNTHESIS",
        name: "Kokoro",
        size: TTS_SIZE,
        url: "https://huggingface.co/hexgrad/Kokoro-82M",
      };
    case "stt":
      return {
        taskName: "SPEECH_RECOGNITION",
        name: "Whisper Base",
        size: STT_SIZE,
        url: "https://huggingface.co/openai/whisper-base",
      };
    case "vlm":
      return {
        taskName: "VISION_LANGUAGE_MODEL",
        name: "SmolVLM 256M",
        size: VLM_SIZE,
        url: "https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct",
      };
    default:
      return null;
  }
};

export default function DownLoadDisclaimer({}: {}) {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { loadModels } = useAgent();
  const [progress, setProgress] = useState<DownloadModelProgress>({
    vad: 0,
    llm: 0,
    tts: 0,
    stt: 0,
    vlm: 0,
  });

  const download = async () => {
    setIsDownloading(true);
    await loadModels((progress) => {
      setProgress(progress);
    });
    setIsDownloading(false);
  };

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
          and ONNX Runtime Web, meaning no data is sent to a server. It can even
          run offline!
        </p>
        <div className="my-16 flex w-full items-center justify-center">
          {isDownloading ? (
            <ul className="w-full">
              {Object.entries(progress).map(([key, progress]) => {
                const model = getModel(key);
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
                VAD_SIZE + LLM_SIZE + TTS_SIZE + STT_SIZE + VLM_SIZE
              )}
              )
            </Button>
          )}
        </div>
      </ContentBox>
    </div>
  );
}
