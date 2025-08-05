import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import Rings from "@ui/jarvis/Rings";
import { useEffect, useState } from "preact/hooks";

export default function Jarvis({}: {}) {
  const { vad } = useVad();
  const { isSpeaking } = useSpeaker();
  const { onEnded, onVadDetected, submit } = useConversation();
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [conversationActive, setConversationActive] = useState<boolean>(false);

  useEffect(() => {
    if (!conversationActive || !isSpeaking) {
      //setAudioLevels([0, 0, 0, 0, 0, 0]);
      //return;
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
      } else if (text.toLowerCase().indexOf("jarvis") !== -1) {
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

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-12 pt-24">
      <Rings
        isActive={conversationActive || isSpeaking}
        isSpeaking={isSpeaking}
        audioLevels={audioLevels}
        size="1.5vmin"
      />
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
