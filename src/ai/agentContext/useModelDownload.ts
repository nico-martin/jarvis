import { useContext } from "preact/hooks";

import AgentContext from "./AgentContext";

function useModelDownload() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useVad must be used within a AgentContextProvider");
  }
  return {
    downloadCheckDone: context.downloadCheckDone,
    downloadedModels: context.downloadedModels,
    preloadModels: context.preloadModels,
  };
}

export default useModelDownload;
