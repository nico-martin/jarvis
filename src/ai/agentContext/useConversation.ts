import { useContext } from "preact/hooks";

import AgentContext from "./AgentContext";

function useConversation() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a AgentContextProvider"
    );
  }
  return {
    messages: context.messages,
    conversationStatus: context.conversationStatus,
    submit: context.submit,
    onVadDetected: context.onVadDetected,
  };
}

export default useConversation;
