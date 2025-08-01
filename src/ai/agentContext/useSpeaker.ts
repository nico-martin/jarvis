import React from "react";

import AgentContext from "./AgentContext";

function useSpeaker() {
  const context = React.useContext(AgentContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a AgentContextProvider"
    );
  }
  return {
    mute: context.mute,
    setMute: context.setMute,
    abortSpeaker: context.abortSpeaker,
  };
}

export default useSpeaker;
