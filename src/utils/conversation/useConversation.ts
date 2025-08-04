import { useContext } from "preact/hooks";

import { ConversationContext } from "./ConversationContext";

function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}

export default useConversation;