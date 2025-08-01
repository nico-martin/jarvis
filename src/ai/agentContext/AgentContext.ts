import { Message, ModelStatus } from "@ai/types";
import React from "react";

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
  onVadDetected: (callback: (text: string) => void) => () => void;
}

const AgentContext = React.createContext<AgentContextValues>(null);

export default AgentContext;
