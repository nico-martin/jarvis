import SpeechToText from "@ai/speechToText/SpeechToText";
import Kokoro from "@ai/textToSpeech/kokoro/Kokoro";
import { MessagePartType, MessageRole, ModelStatus } from "@ai/types";
import VoiceActivityDetection, {
  VoiceActivityDetectionStatus,
} from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { Dot, PageContent } from "@theme";
import { Chat } from "@ui/chat/Chat";
import useConversation from "@utils/conversation/useConversation";
import React from "react";
import { v4 as uuidv4 } from "uuid";

import { version } from "../../package.json";

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
    //stt.preload();
    return stt;
  }, []);

  const tts = React.useMemo(() => {
    const k = new Kokoro();
    //k.preload();
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
    //vad.preload();
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

  const statusText =
    status === ModelStatus.IDLE
      ? "OFFLINE"
      : status === ModelStatus.LOADING
        ? "INITIALIZING..."
        : status === ModelStatus.LOADED
          ? "ONLINE"
          : "ERROR";

  return (
    <React.Fragment>
      <PageContent
        title={`JARVIS`}
        statusBar={{
          [`VERSION_${version}`]: false,
          [`STATUS: ${statusText}`]: true,
        }}
        button={{
          to: "/mcp",
          children: "MCP_SETTINGS",
        }}
      >
        <Chat
          onSubmitPrompt={submit}
          messages={messages}
          status={status}
          statusText={statusText}
          className=""
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
        />
      </PageContent>
      <div className="fixed bottom-8 left-8 space-y-2">
        <div className="text-secondary-300 flex items-center space-x-2 text-xs">
          <Dot />
          <span>
            VOICE_DETECTION:{" "}
            {vadStatus !== VoiceActivityDetectionStatus.IDLE
              ? "ACTIVE"
              : "STANDBY"}
          </span>
        </div>
        <div className="text-primary-300 flex items-center space-x-2 font-mono text-xs">
          <Dot />
          <span>AUDIO_OUTPUT: {mute ? "MUTED" : "ENABLED"}</span>
        </div>
      </div>
    </React.Fragment>
  );
}

export default ChatPage;
