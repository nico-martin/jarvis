import React from "react";

import AgentContext from "./AgentContext";

function useVad() {
  const context = React.useContext(AgentContext);
  if (!context) {
    throw new Error("useVad must be used within a AgentContextProvider");
  }
  return {
    vad: context.vad,
    vadStatus: context.vadStatus,
  };
}

export default useVad;
