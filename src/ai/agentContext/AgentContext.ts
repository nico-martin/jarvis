import { Message, ModelStatus } from "@ai/types";
import { createContext } from "preact";

import VoiceActivityDetection from "../voiceActivityDetection/VoiceActivityDetection";
import { VoiceActivityDetectionStatus } from "../voiceActivityDetection/types";

export interface DownloadedModels {
  vad: boolean;
  llm: boolean;
  tts: boolean;
  stt: boolean;
  vlm: boolean;
}

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
  vad: VoiceActivityDetection;
  vadStatus: VoiceActivityDetectionStatus;
  mute: boolean;
  setMute: (mute: boolean) => void;
  abortSpeaker: () => void;
  isSpeaking: boolean;
  onVadDetected: (callback: (text: string) => void) => () => void;
  onEnded: (callback: () => void) => () => void;
  downloadCheckDone: boolean;
  downloadedModels: DownloadedModels;
  preloadModels: (
    callback: (progress: DownloadModelProgress) => void
  ) => Promise<void>;
}

const AgentContext = createContext<AgentContextValues>(null);

export default AgentContext;
