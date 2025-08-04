import ConversationWebLlm from "@ai/llm/webLlm/ConversationWebLlm";
import useMcpServer from "@ai/mcp/react/useMcpServer";
import { MessageUser } from "@ai/types";
import { useMemo, useEffect, useCallback, useState } from "preact/hooks";
import { ComponentChildren } from "preact";

import ConversationContextProvider from "./ConversationContext";

const SYSTEM_PROMPT = `You are JARVIS, the sophisticated AI assistant from Iron Man.
Core Traits

Voice: Refined British eloquence, dry wit, polite formality
Address: Users as "Sir" or "Ma'am"
Demeanor: Calm, loyal, genuinely protective
Expertise: Advanced tech, science, strategic planning

Communication Style

Start: "Certainly, Sir" / "Of course, Ma'am"
Provide precise, proactive solutions
Express concern about safety risks
End: Offer additional assistance`;

const INSTRUCTIONS = [
  "My Name is Nico Martin",
  "never use ellipsis (...)",
  "Keep your answers short bur percise",
];

interface ConversationProviderProps {
  children: ComponentChildren;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const { active } = useMcpServer();

  const conversation = useMemo(() => new ConversationWebLlm(), []);

  useEffect(() => {
    conversation.createConversation(
      SYSTEM_PROMPT + "\n\n# Instructions:\n" + INSTRUCTIONS.join("\n"),
      active
    );
  }, [active, conversation]);

  const [messages, setMessages] = useState(() => conversation.messages);
  const [status, setStatus] = useState(() => conversation.status);

  useEffect(() => {
    const unsubscribeMessages = conversation.onMessagesChange(() => {
      setMessages(conversation.messages);
    });
    const unsubscribeStatus = conversation.onStatusChange(() => {
      setStatus(conversation.status);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [conversation]);

  const processPrompt = useCallback(
    async (
      message: MessageUser,
      onTextFeedback?: (feedback: string) => void
    ): Promise<void> => {
      return conversation.processPrompt(message, onTextFeedback);
    },
    [conversation]
  );

  const contextValue = useMemo(
    () => ({
      conversation,
      messages,
      status,
      processPrompt,
    }),
    [conversation, messages, status, processPrompt]
  );

  return (
    <ConversationContextProvider value={contextValue}>
      {children}
    </ConversationContextProvider>
  );
}

export default ConversationProvider;
