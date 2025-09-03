import { useContext } from "preact/hooks";

import AgentContext from "./AgentContext";

function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within a AgentContextProvider");
  }
  return context;
}

export default useAgent;
