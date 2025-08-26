import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import { MessagePartTool, MessagePartType, MessageRole } from "@ai/types";
import Rings from "@ui/jarvis/Rings";
import ToolCallPopup from "@ui/jarvis/ToolCallPopup";
import { useEffect, useRef, useState } from "preact/hooks";
import toast from "react-hot-toast";

const JARVIS_KEYWORDS = ["charmus", "jarvis", "JARIFAS", "Charmis"].map((s) =>
  s.toLowerCase()
);

export default function Jarvis({}: {}) {
  const { vad } = useVad();
  const { isSpeaking } = useSpeaker();
  const { onEnded, onVadDetected, submit, messages } = useConversation();
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [conversationActive, setConversationActive] = useState<boolean>(false);
  const processedToolCalls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationActive || !isSpeaking) {
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
  }, [conversationActive, isSpeaking]);

  useEffect(() => {
    vad.startMicrophone();
    const unsubscribe = onEnded(() => {
      setConversationActive(false);
    });

    return () => {
      unsubscribe();
      vad.stopMicrophone();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onVadDetected((text: string) => {
      if (conversationActive) {
        submit(text);
      } else if (
        JARVIS_KEYWORDS.some((word) => text.toLowerCase().includes(word))
      ) {
        setConversationActive(true);
        submit(text);
      } else {
        console.log(text);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [onVadDetected, submit, conversationActive]);

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

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-12 pt-44">
      {/* Rings container with tool call popups */}
      <div className="relative">
        <Rings
          isActive={conversationActive || isSpeaking}
          isSpeaking={isSpeaking}
          audioLevels={audioLevels}
          size="1.5vmin"
        />
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-sm transition-all duration-500 ${
            conversationActive
              ? isSpeaking
                ? "animate-pulse text-orange-400"
                : "text-cyan-400"
              : "text-slate-500"
          }`}
        >
          {conversationActive ? (isSpeaking ? "SPEAKING" : "ACTIVE") : "IDLE"}
        </div>
        {isSpeaking && (
          <div className="mt-1 font-mono text-xs text-orange-300">
            VOICE OUTPUT
          </div>
        )}
      </div>
    </div>
  );
}
