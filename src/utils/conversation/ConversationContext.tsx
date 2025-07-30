import { Conversation, Message, MessageUser, ModelStatus } from "@ai/types";
import React from "react";

interface ConversationContextValue {
  conversation: Conversation | null;
  messages: Array<Message>;
  status: ModelStatus;
  processPrompt: (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ) => Promise<void>;
}

const ConversationContext =
  React.createContext<ConversationContextValue | null>(null);

interface ConversationContextProps {
  value: ConversationContextValue;
  children: React.ReactNode;
}

export default function ConversationContextProvider({
  value,
  children,
}: ConversationContextProps) {
  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export { ConversationContext };
