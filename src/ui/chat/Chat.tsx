import { Message as MessageI, ModelStatus } from "@ai/types";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/VoiceActivityDetection";
import {
  EllipsisHorizontalIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon as MicrophoneIconSolid } from "@heroicons/react/24/solid";
import { Button, Loader, McpIcon } from "@theme";
import cn from "@utils/classnames";
import React, { FormEvent } from "react";

import { Message } from "./Message";

export function Chat({
  modelLoading = false,
  thinking = false,
  onSubmitPrompt,
  messages,
  status,
  className = "",
  recording,
  mute,
  openMcpSettings,
}: {
  modelLoading?: boolean;
  thinking?: boolean;
  onSubmitPrompt: (prompt: string) => void;
  messages: Array<MessageI>;
  status: ModelStatus;
  className?: string;
  recording: {
    status: VoiceActivityDetectionStatus;
    toggle: () => void;
  };
  mute: {
    isMute: boolean;
    toggle: () => void;
  };
  openMcpSettings: () => void;
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
        "flex flex-col justify-end gap-2 space-y-2 border border-blue-400/60 bg-black/80 backdrop-blur-sm p-6 shadow-[0_0_40px_rgba(0,162,255,0.4)]",
        className
      )}
    >
      <ul ref={listRef} className="space-y-4 overflow-y-auto max-h-[60vh]">
        {messages.map((message) => (
          <li key={message.id}>
            <Message message={message} />
          </li>
        ))}
      </ul>
      {modelLoading && (
        <p className="flex w-19/20 items-center gap-4 self-end border border-blue-400/60 bg-blue-950/40 backdrop-blur-sm p-4 text-blue-200 font-mono text-sm shadow-[0_0_20px_rgba(0,162,255,0.3)]">
          <Loader /> LOADING_MODEL_COMPONENTS...
        </p>
      )}
      <form className="flex w-full items-stretch gap-2" onSubmit={onSubmit}>
        <input
          type="text"
          name="prompt"
          ref={promptRef}
          placeholder="ENTER_COMMAND..."
          className="w-full border border-blue-400/70 bg-blue-950/40 backdrop-blur-sm px-3.5 py-2 text-base text-blue-100 placeholder:text-blue-300/70 font-mono focus:border-blue-300 focus:ring-2 focus:ring-blue-400/70 focus:outline-none shadow-[inset_0_0_15px_rgba(0,162,255,0.2)]"
        />
        <Button 
          type="submit" 
          disabled={thinking}
          className="border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] hover:border-blue-300 transition-all duration-300"
        >
          <PaperAirplaneIcon width="1.5em" />
        </Button>
      </form>
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-blue-200">
          AI_CORE: {status === ModelStatus.IDLE && "OFFLINE"}
          {status === ModelStatus.LOADING && "INITIALIZING..."}
          {status === ModelStatus.LOADED && "ONLINE"}
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            title="MCP_INTERFACE" 
            to="/mcp"
            className="border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 transition-all duration-300"
          >
            <McpIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={mute.toggle}
            title={mute.isMute ? "AUDIO_ENABLE" : "AUDIO_DISABLE"}
            className="border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 transition-all duration-300"
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
              "border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 transition-all duration-300",
              recording.status === VoiceActivityDetectionStatus.RECORDING
                ? "animate-pulse [animation-duration:0.75s] shadow-[0_0_20px_rgba(0,162,255,0.5)]"
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
