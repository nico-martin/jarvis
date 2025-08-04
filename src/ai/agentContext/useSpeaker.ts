import { useContext } from "preact/hooks";

import AgentContext from "./AgentContext";

function useSpeaker() {
  const context = useContext(AgentContext);
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
