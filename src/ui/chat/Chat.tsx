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
import { Button, InputText, Loader, McpIcon } from "@theme";
import cn from "@utils/classnames";
import React, { FormEvent } from "react";

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
  const listRef = React.useRef<HTMLUListElement>(null);
  const messagesLengthRef = React.useRef<number>(0);
  const promptRef = React.useRef<HTMLInputElement>(null);

  const messagesLength = React.useMemo(
    () => JSON.stringify(messages).length,
    [messages]
  );

  React.useEffect(() => {
    if (messagesLength === messagesLengthRef.current) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    messagesLengthRef.current = messagesLength;
  }, [messagesLength]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promptRef.current) return;
    const prompt = promptRef.current.value;
    promptRef.current.value = "";
    if (prompt) onSubmitPrompt(prompt);
  };

  return (
    <div
      className={cn(
        "border-primary-400/30 flex flex-col justify-end border bg-black/80 shadow-[0_0_30px_rgba(0,162,255,0.2)] backdrop-blur-sm",
        className
      )}
    >
      <ul
        ref={listRef}
        className="scrollbar-hide max-h-[60vh] space-y-4 overflow-y-auto p-4"
      >
        {[
          ...messages,
          {
            id: "uuidv4()44",
            role: MessageRole.ASSISTANT,
            messageParts: [
              {
                id: "uuidv4()3",
                type: MessagePartType.TEXT,
                text: "Hello!",
              },
              {
                id: "uuidv4()4",
                type: MessagePartType.TEXT,
                text: "How can I help you today?",
              },
              {
                id: "uuidv4()4",
                type: MessagePartType.TOOL_CALL,
                functionName: "my-function",
                parameters: { test: 1, foo: "BAR" },
                response: "mweomxdowelx",
              },
            ],
          },
        ].map((message) => (
          <li key={message.id}>
            <Message message={message} />
          </li>
        ))}
      </ul>
      <form
        className="border-primary-400/30 flex w-full items-stretch gap-2 border-t-1 p-4"
        onSubmit={onSubmit}
      >
        <InputText
          type="text"
          name="prompt"
          placeholder="ENTER_COMMAND..."
          ref={promptRef}
          className="w-full"
        />
        <Button type="submit">
          <PaperAirplaneIcon width="1.5em" />
        </Button>
      </form>
      <div className="flex items-center justify-between p-4 pt-0">
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
    </div>
  );
}
