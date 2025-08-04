import { Conversation, Message, MessageUser, ModelStatus } from "@ai/types";
import { createContext } from "preact";
import { ComponentChildren } from "preact";

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
  createContext<ConversationContextValue | null>(null);

interface ConversationContextProps {
  value: ConversationContextValue;
  children: ComponentChildren;
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
