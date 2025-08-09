import { DownloadModelProgress } from "@ai/agentContext/AgentContext";
import useModelDownload from "@ai/agentContext/useModelDownload";
import { EXPECTED_FILES as EXPECTED_FILES_STT } from "@ai/speechToText/constants";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { Button, ContentBox, Progress } from "@theme";
import formatBytes from "@utils/formatBytes";
import { useState } from "preact/hooks";

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
        size: 2243022,
        url: "https://github.com/snakers4/silero-vad",
      };
    case "llm":
      return {
        taskName: "LARGE_LANGUAGE_MODEL",
        name: "Qwen3 4B",
        size: 9,
        url: "https://github.com/snakers4/silero-vad",
      };
    case "tts":
      return {
        taskName: "TEXT_TO_SPEECH",
        name: "Qwen3 4B",
        size: 9,
        url: "https://github.com/snakers4/silero-vad",
      };
    case "stt":
      return {
        taskName: "SPEECH_RECOGNITION",
        name: "Whisper Base",
        size: Object.values(EXPECTED_FILES_STT).reduce(
          (acc, size) => acc + size,
          0
        ),
        url: "https://huggingface.co/openai/whisper-base",
      };
    default:
      return null;
  }
};

export default function DownLoadDisclaimer({}: {}) {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { preloadModels } = useModelDownload();
  const [progress, setProgress] = useState<DownloadModelProgress>({
    vad: 0,
    llm: 0,
    tts: 0,
    stt: 0,
  });

  const download = async () => {
    setIsDownloading(true);
    await preloadModels((progress) => {
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
              Download required models (≈ 3GB)
            </Button>
          )}
        </div>
      </ContentBox>
    </div>
  );
}
