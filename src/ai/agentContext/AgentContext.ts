import { Message, ModelStatus } from "@ai/types";
import { createContext } from "preact";
import { Dispatch, StateUpdater } from "preact/hooks";

export interface DownloadModelProgress {
  vad: number;
  llm: number;
  tts: number;
  stt: number;
  vlm: number;
}

export interface AgentContextValues {
  messages: Array<Message>;
  conversationStatus: ModelStatus;
  submit: (query: string) => Promise<void>;
  isMute: boolean;
  setMute: (mute: boolean) => void;
  isDeaf: boolean;
  setDeaf: (deaf: boolean) => Promise<void>;
  isSpeaking: boolean;
  loadModels: (
    callback: (progress: DownloadModelProgress) => void
  ) => Promise<void>;
  cacheCheckDone: boolean;
  allModelsLoaded: boolean;
  onVadDetected: (callback: (text: string) => void) => () => void;
  evaluateConversation: () => void;
  jarvisActive: boolean;
  setJarvisActive: Dispatch<StateUpdater<boolean>>;
}

const AgentContext = createContext<AgentContextValues>(null);

export default AgentContext;
