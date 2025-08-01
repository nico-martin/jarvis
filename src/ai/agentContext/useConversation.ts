import React from "react";

import AgentContext from "./AgentContext";

function useConversation() {
  const context = React.useContext(AgentContext);
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
