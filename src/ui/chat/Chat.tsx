import useAgent from "@ai/agentContext/useAgent";
import { ModelStatus } from "@ai/types";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Button, ContentBox, InputText } from "@theme";
import cn from "@utils/classnames";
import { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { Message } from "./Message";

export default function Chat({
  conversationStatusText,
  className = "",
}: {
  conversationStatusText: string;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const messagesLengthRef = useRef<number>(0);
  const [prompt, setPrompt] = useState<string>("");
  const { conversationStatus, messages, submit } = useAgent();

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
    if (prompt && conversationStatus === ModelStatus.READY) submit(prompt);
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
          <p className="text-text-bright text-xs">
            AI_CORE: {conversationStatusText}
          </p>
        </div>
      </ContentBox>
    </div>
  );
}
