import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/VoiceActivityDetection";
import Rings from "@ui/jarvis/Rings";
import { useEffect, useState } from "preact/hooks";

export default function Jarvis({}: {}) {
  const { vad, vadStatus } = useVad();
  const { isSpeaking } = useSpeaker();
  const { onEnded } = useConversation();
  const isActive = vadStatus !== VoiceActivityDetectionStatus.IDLE;
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (!isActive || !isSpeaking) {
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
  }, [isActive, isSpeaking]);

  useEffect(() => {
    const unsubscribe = onEnded(() => {
      console.log("onended stopMicrophone");
      vad.stopMicrophone();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div
      //onClick={() => setIsSpeaking(!isSpeaking)}
      className="relative flex w-full flex-col items-center justify-center gap-12 pt-24"
    >
      <button
        onClick={() =>
          vadStatus !== VoiceActivityDetectionStatus.IDLE
            ? vad.stopMicrophone()
            : vad.startMicrophone()
        }
      >
        voice
      </button>
      <Rings
        isActive={isActive}
        isSpeaking={isSpeaking}
        audioLevels={audioLevels}
        size="1.5vmin"
      />
      <div className="text-center">
        <div
          className={`font-mono text-sm transition-all duration-500 ${
            isActive
              ? isSpeaking
                ? "animate-pulse text-orange-400"
                : "text-cyan-400"
              : "text-slate-500"
          }`}
        >
          {isActive ? (isSpeaking ? "SPEAKING" : "ACTIVE") : "IDLE"}
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
