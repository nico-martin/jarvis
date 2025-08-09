import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import { ModelStatus } from "@ai/types";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/types";
import {
  EllipsisHorizontalIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon as MicrophoneIconSolid } from "@heroicons/react/24/solid";
import { Button, ContentBox, InputText, McpIcon } from "@theme";
import cn from "@utils/classnames";
import { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { Message } from "./Message";

export default function Chat({
  onSubmitPrompt,
  statusText,
  className = "",
}: {
  onSubmitPrompt: (prompt: string) => void;
  statusText: string;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const messagesLengthRef = useRef<number>(0);
  const [prompt, setPrompt] = useState<string>("");
  const { messages, conversationStatus, submit, onVadDetected } =
    useConversation();
  const { vad, vadStatus } = useVad();
  const { mute, setMute, abortSpeaker } = useSpeaker();

  useEffect(() => {
    const unsubscribe = onVadDetected((text: string) => {
      submit(text);
    });
    return () => {
      unsubscribe();
    };
  }, [onVadDetected, submit]);

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
    if (prompt && conversationStatus === ModelStatus.READY)
      onSubmitPrompt(prompt);
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
          <Button
            type="submit"
            disabled={conversationStatus !== ModelStatus.READY}
          >
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
              onClick={() => {
                if (mute) {
                  setMute(false);
                } else {
                  setMute(true);
                  abortSpeaker();
                }
              }}
              title={mute ? "AUDIO_ENABLE" : "AUDIO_DISABLE"}
            >
              {mute ? (
                <SpeakerXMarkIcon width="1.25em" />
              ) : (
                <SpeakerWaveIcon width="1.25em" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                vadStatus === VoiceActivityDetectionStatus.IDLE
                  ? vad.startMicrophone()
                  : vad.stopMicrophone()
              }
              className={cn(
                vadStatus === VoiceActivityDetectionStatus.RECORDING
                  ? "animate-pulse [animation-duration:0.75s]"
                  : ""
              )}
              title={
                vadStatus === VoiceActivityDetectionStatus.IDLE
                  ? "VOICE_ACTIVATION"
                  : vadStatus === VoiceActivityDetectionStatus.WAITING
                    ? "VOICE_STANDBY..."
                    : "VOICE_RECORDING"
              }
            >
              {vadStatus === VoiceActivityDetectionStatus.IDLE ? (
                <MicrophoneIcon width="1.25em" />
              ) : vadStatus === VoiceActivityDetectionStatus.WAITING ? (
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
