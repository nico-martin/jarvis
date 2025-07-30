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
];

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
          speechToText
            .generate(buffer)
            .then((text) => !FILL_WORDS.includes(text) && submit(text));
      },
    });
    return vad;
  }, [speechToText, submit]);

  const vadStatus = React.useSyncExternalStore(
    (cb) => vad.onStatusChange(cb),
    () => vad.status
  );

  return (
    <div className="flex h-screen items-center justify-center bg-stone-200 p-4">
      <Link
        to="/mcp"
        className="absolute top-4 right-4 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
      >
        MCP Overview
      </Link>
      <Chat
        onSubmitPrompt={submit}
        messages={messages}
        status={status}
        className="h-full max-h-full w-1/2"
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
  );
}

export default ChatPage;
