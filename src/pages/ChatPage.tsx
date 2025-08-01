import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import { ModelStatus } from "@ai/types";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { Dot, PageContent } from "@theme";
import { Chat } from "@ui/chat/Chat";
import React from "react";

import { version } from "../../package.json";

export function ChatPage() {
  const { messages, conversationStatus, submit, onVadDetected } =
    useConversation();
  const { vad, vadStatus } = useVad();
  const { mute, setMute, abortSpeaker } = useSpeaker();

  React.useEffect(() => {
    const unsubscribe = onVadDetected((text: string) => {
      submit(text);
    });
    return unsubscribe;
  }, [onVadDetected, submit]);

  const statusText =
    conversationStatus === ModelStatus.IDLE
      ? "OFFLINE"
      : conversationStatus === ModelStatus.LOADING
        ? "INITIALIZING..."
        : conversationStatus === ModelStatus.LOADED
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
          status={conversationStatus}
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
                abortSpeaker();
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
