import { Message, ModelStatus } from "@ai/types";
import { createContext } from "preact";

import VoiceActivityDetection, {
  VoiceActivityDetectionStatus,
} from "../voiceActivityDetection/VoiceActivityDetection";

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
}

const AgentContext = createContext<AgentContextValues>(null);

export default AgentContext;
