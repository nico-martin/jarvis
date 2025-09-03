import useAgent from "@ai/agentContext/useAgent";
import {
  MessagePartTool,
  MessagePartType,
  MessageRole,
  ModelStatus,
} from "@ai/types";
import { LoadingDots } from "@theme";
import { useEffect, useRef, useState } from "preact/hooks";
import toast from "react-hot-toast";

import Rings from "./Rings";
import ToolCallPopup from "./ToolCallPopup";

const JARVIS_KEYWORDS = [
  "charmus",
  "jarvis",
  "JARIFAS",
  "Charmis",
  "Jarmus",
].map((s) => s.toLowerCase());

export default function Jarvis({}: {}) {
  const {
    isSpeaking,
    submit,
    onVadDetected,
    messages,
    conversationStatus,
    isDeaf,
    setDeaf,
    setMute,
    jarvisActive,
    setJarvisActive,
  } = useAgent();
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const processedToolCalls = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDeaf(false);
    setMute(false);
    return () => {
      setDeaf(true);
      setMute(true);
    };
  }, []);

  useEffect(() => {
    if (!jarvisActive || !isSpeaking) {
      setAudioLevels([0, 0, 0, 0, 0, 0]);
      return;
    }

    const interval = setInterval(() => {
      if (isSpeaking) {
        setAudioLevels((prev) => prev.map(() => Math.random() * 100));
      } else {
        setAudioLevels((prev) => prev.map((level) => Math.max(0, level * 0.8)));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [jarvisActive, isSpeaking]);

  useEffect(() => {
    const unsubscribe = onVadDetected((text: string) => {
      if (jarvisActive) {
        submit(text);
      } else if (
        JARVIS_KEYWORDS.some((word) => text.toLowerCase().includes(word))
      ) {
        setJarvisActive(true);
        submit(text);
      } else {
        console.log(text);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [onVadDetected, submit, jarvisActive]);

  useEffect(() => {
    const toolCalls = messages
      .filter((m) => m.role === MessageRole.ASSISTANT)
      .flatMap(
        (m) =>
          m.messageParts.filter(
            (mp) => mp.type === MessagePartType.TOOL_CALL
          ) as MessagePartTool[]
      );

    toolCalls
      .filter((tc) => !processedToolCalls.current.has(tc.id))
      .forEach((tc) => {
        toast.custom(<ToolCallPopup id={tc.id} />, { duration: 20000 });
        processedToolCalls.current.add(tc.id);
      });
  }, [messages]);

  const text =
    conversationStatus === ModelStatus.CONVERSATION_LOADING ||
    conversationStatus === ModelStatus.MODEL_LOADING ? (
      <span>
        Please wait a moment while
        <br />
        everything is being prepared
        <LoadingDots />
      </span>
    ) : isSpeaking ? (
      <span>VOICE OUTPUT</span>
    ) : isDeaf ? (
      <span>Activate voice detection first.</span>
    ) : jarvisActive ? (
      <span />
    ) : (
      <span>READY! Start the conversation with "Jarvis"</span>
    );

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-12 pt-44">
      <div className="relative">
        <Rings
          isActive={jarvisActive || isSpeaking}
          isSpeaking={isSpeaking}
          audioLevels={audioLevels}
          size="1.5vmin"
        />
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-sm transition-all duration-500 ${
            jarvisActive
              ? isSpeaking
                ? "animate-pulse text-orange-400"
                : "text-cyan-400"
              : "text-slate-500"
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
