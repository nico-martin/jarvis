import React from "react";

import { ConversationContext } from "./ConversationContext";

function useConversation() {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}

export default useConversation;