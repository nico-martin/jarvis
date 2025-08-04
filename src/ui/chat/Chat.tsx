import {
  Message as MessageI,
  MessagePartType,
  MessageRole,
  ModelStatus,
} from "@ai/types";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/VoiceActivityDetection";
import {
  EllipsisHorizontalIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon as MicrophoneIconSolid } from "@heroicons/react/24/solid";
import { Button, ContentBox, InputText, Loader, McpIcon } from "@theme";
import cn from "@utils/classnames";
import { useRef, useState, useMemo, useEffect } from "preact/hooks";
import { JSX } from "preact";

import { Message } from "./Message";

export function Chat({
  thinking = false,
  onSubmitPrompt,
  messages,
  status,
  statusText,
  className = "",
  recording,
  mute,
}: {
  thinking?: boolean;
  onSubmitPrompt: (prompt: string) => void;
  messages: Array<MessageI>;
  status: ModelStatus;
  statusText: string;
  className?: string;
  recording: {
    status: VoiceActivityDetectionStatus;
    toggle: () => void;
  };
  mute: {
    isMute: boolean;
    toggle: () => void;
  };
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const messagesLengthRef = useRef<number>(0);
  const [prompt, setPrompt] = useState<string>("");

  const messagesLength = useMemo(
    () => JSON.stringify(messages).length,
    [messages]
  );

  useEffect(() => {
    if (messagesLength === messagesLengthRef.current) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    messagesLengthRef.current = messagesLength;
  }, [messagesLength]);

  const onSubmit = async (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
    e.preventDefault();
    if (prompt) onSubmitPrompt(prompt);
    setPrompt("");
  };

  return (
    <div className={cn(className, "space-y-4")}>
      <ContentBox className="!p-0">
        <ul
          ref={listRef}
          className="scrollbar-hide max-h-[50vh] space-y-4 overflow-y-auto p-4"
        >
          {messages.map((message) => (
            <li key={message.id}>
              <Message message={message} />
            </li>
          ))}
        </ul>
      </ContentBox>
      <ContentBox className="space-y-4 p-4">
        <form className="flex w-full items-stretch gap-2" onSubmit={onSubmit}>
          <InputText
            type="text"
            id="prompt"
            name="prompt"
            placeholder="ENTER_COMMAND..."
            className="w-full"
            value={prompt}
            onChange={(e) => setPrompt((e.target as HTMLInputElement).value)}
          />
          <Button type="submit">
            <PaperAirplaneIcon width="1.5em" />
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <p className="text-text-bright text-xs">AI_CORE: {statusText}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" title="MCP_INTERFACE" to="/mcp">
              <McpIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={mute.toggle}
              title={mute.isMute ? "AUDIO_ENABLE" : "AUDIO_DISABLE"}
            >
              {mute.isMute ? (
                <SpeakerXMarkIcon width="1.25em" />
              ) : (
                <SpeakerWaveIcon width="1.25em" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={recording.toggle}
              className={cn(
                recording.status === VoiceActivityDetectionStatus.RECORDING
                  ? "animate-pulse [animation-duration:0.75s]"
                  : ""
              )}
              title={
                recording.status === VoiceActivityDetectionStatus.IDLE
                  ? "VOICE_ACTIVATION"
                  : recording.status === VoiceActivityDetectionStatus.WAITING
                    ? "VOICE_STANDBY..."
                    : "VOICE_RECORDING"
              }
            >
              {recording.status === VoiceActivityDetectionStatus.IDLE ? (
                <MicrophoneIcon width="1.25em" />
              ) : recording.status === VoiceActivityDetectionStatus.WAITING ? (
                <MicrophoneIconSolid width="1.25em" />
              ) : (
                <EllipsisHorizontalIcon width="1.25em" />
              )}
            </Button>
          </div>
        </div>
      </ContentBox>
    </div>
  );
}
