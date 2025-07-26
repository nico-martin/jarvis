import { Message as MessageI, ModelStatus } from "@ai/types";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { Button, Loader } from "@theme";
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
}: {
  modelLoading?: boolean;
  thinking?: boolean;
  onSubmitPrompt: (prompt: string) => void;
  messages: Array<MessageI>;
  status: ModelStatus;
  className?: string;
  recording: {
    isRecording: boolean;
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
    () =>
      messages.reduce(
        (acc, message) => acc + (message?.text || "").toString().length,
        0
      ),
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
        "flex flex-col justify-end gap-2 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-lg",
        className
      )}
    >
      <ul ref={listRef} className="space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <li key={message.id}>
            <Message message={message} />
          </li>
        ))}
      </ul>
      {modelLoading && (
        <p className="flex w-19/20 items-center gap-4 self-end rounded-md border border-stone-300 bg-stone-100 p-4 text-stone-700">
          <Loader /> loading the model. Check the console for more infos.
        </p>
      )}
      <form className="flex w-full items-stretch gap-2" onSubmit={onSubmit}>
        <input
          type="text"
          name="prompt"
          ref={promptRef}
          className="w-full rounded-md border border-stone-300 bg-stone-100 px-3.5 py-2 text-base text-stone-800 placeholder:text-stone-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        <Button type="submit" disabled={thinking}>
          <PaperAirplaneIcon width="1.5em" />
        </Button>
      </form>
      <div className="flex justify-between">
        <p className="text-xs text-stone-500">
          Model: {status === ModelStatus.IDLE && "Not loaded"}
          {status === ModelStatus.LOADING && "Loading..."}
          {status === ModelStatus.LOADED && "Ready"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={mute.toggle}
            title={mute.isMute ? "Unmute" : "Mute"}
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
            title={recording.isRecording ? "Stop listener" : "Start listener"}
          >
            {recording.isRecording ? (
              <StopIcon width="1.25em" />
            ) : (
              <MicrophoneIcon width="1.25em" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
