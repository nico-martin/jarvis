import SpeechToText from "@ai/speechToText/SpeechToText";
import Kokoro from "@ai/textToSpeech/kokoro/Kokoro";
import { MessagePartType, MessageRole } from "@ai/types";
import VoiceActivityDetection, {
  VoiceActivityDetectionStatus,
} from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { Chat } from "@ui/chat/Chat";
import useConversation from "@utils/conversation/useConversation";
import React from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const FILL_WORDS = [
  // Non-speech sounds
  "(laughs)",
  "(laughter)",
  "(chuckles)",
  "(coughs)",
  "(clears throat)",
  "(sighs)",
  "(sniffs)",
  "(breathing)",
  "(inhales)",
  "(exhales)",
  "(applause)",
  "(music)",
  "(silence)",

  // Whisper-specific artifacts
  "[BLANK_AUDIO]",
  "[Music]",
  "[Applause]",
  "[Laughter]",
  "[Silence]",
  "[Inaudible]",
  "[Background noise]",
].map((s) => s.toLowerCase());

export function ChatPage() {
  const [mute, setMute] = React.useState<boolean>(false);
  const [speakerAbortController, setSpeakerAbortController] = React.useState(
    () => new AbortController()
  );

  const { messages, status, processPrompt } = useConversation();

  const speechToText = React.useMemo(() => {
    const stt = new SpeechToText();
    stt.preload();
    return stt;
  }, []);

  const tts = React.useMemo(() => {
    const k = new Kokoro();
    k.preload();
    return k;
  }, []);

  const submit = React.useCallback(
    (prompt: string) =>
      processPrompt(
        {
          id: uuidv4(),
          messageParts: [
            {
              type: MessagePartType.TEXT,
              id: uuidv4(),
              text: prompt,
            },
          ],
          role: MessageRole.USER,
        },
        (feedback) =>
          !mute && tts.speak(feedback, speakerAbortController.signal)
      ),
    [processPrompt, mute, tts, speakerAbortController.signal]
  );

  const vad = React.useMemo(() => {
    const vad = new VoiceActivityDetection();
    vad.preload();
    vad.setCallbacks({
      onSpeechChunk: (buffer, timing) => {
        timing.duration > 200 &&
          speechToText.generate(buffer).then((text) => {
            return (
              FILL_WORDS.indexOf(text.trim().toLowerCase()) === -1 &&
              submit(text)
            );
          });
      },
    });
    return vad;
  }, [speechToText, submit]);

  const vadStatus = React.useSyncExternalStore(
    (cb) => vad.onStatusChange(cb),
    () => vad.status
  );

  return (
    <div className="relative flex h-screen items-center justify-center bg-black overflow-hidden">
      {/* JARVIS-style animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-black to-cyan-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,162,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(0,162,255,0.05)_50%,transparent_70%)] animate-pulse" />
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,162,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,162,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      
      {/* Corner decorative elements */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-blue-400/50" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-blue-400/50" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-blue-400/50" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-blue-400/50" />
      
      <Link
        to="/mcp"
        className="absolute top-4 right-20 px-4 py-2 text-lg font-mono text-blue-300 border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm hover:bg-blue-900/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] hover:border-blue-300"
      >
        MCP_OVERVIEW
      </Link>
      
      {/* Central HUD container */}
      <div className="relative w-4/5 max-w-6xl h-4/5 border border-blue-400/30 bg-black/40 backdrop-blur-sm shadow-[0_0_50px_rgba(0,162,255,0.2)]">
        {/* HUD header */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 border-b border-blue-400/30">
          <div className="flex items-center justify-between h-full px-4 text-sm font-mono text-blue-300">
            <span>ALFRED_SYSTEM_v2.1</span>
            <span className="animate-pulse">STATUS: ACTIVE</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <Chat
          onSubmitPrompt={submit}
          messages={messages}
          status={status}
          className="h-full w-full pt-10 jarvis-theme"
          recording={{
            status: vadStatus,
            toggle: () =>
              vadStatus === VoiceActivityDetectionStatus.IDLE
                ? vad.startMicrophone()
                : vad.stopMicrophone(),
          }}
          mute={{
            isMute: mute,
            toggle: () => {
              if (mute) {
                setMute(false);
              } else {
                setMute(true);
                speakerAbortController.abort();
                setSpeakerAbortController(new AbortController());
              }
            },
          }}
          openMcpSettings={() => window.open("/mcp", "_blank")}
        />
      </div>
      
      {/* Floating status indicators */}
      <div className="absolute bottom-8 left-8 space-y-2">
        <div className="flex items-center space-x-2 text-sm font-mono text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>VOICE_DETECTION: {vadStatus !== VoiceActivityDetectionStatus.IDLE ? 'ACTIVE' : 'STANDBY'}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm font-mono text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span>AUDIO_OUTPUT: {mute ? 'MUTED' : 'ENABLED'}</span>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
