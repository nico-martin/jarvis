import useConversation from "@ai/agentContext/useConversation";
import useSpeaker from "@ai/agentContext/useSpeaker";
import useVad from "@ai/agentContext/useVad";
import { ModelStatus } from "@ai/types";
import { VoiceActivityDetectionStatus } from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { Dot, McpIcon, PageContent } from "@theme";
import Chat from "@ui/chat/Chat";
import Jarvis from "@ui/jarvis/Jarvis";
import { Fragment } from "preact";
import { useState } from "preact/hooks";

import { version } from "../../package.json";

export function ChatPage() {
  const [ui, setUi] = useState<"chat" | "jarvis">("jarvis");
  const { conversationStatus, submit } = useConversation();
  const { vadStatus } = useVad();
  const { mute, setMute, abortSpeaker } = useSpeaker();

  const statusText =
    conversationStatus === ModelStatus.IDLE
      ? "OFFLINE"
      : conversationStatus === ModelStatus.MODEL_LOADING
        ? "LOADING..."
        : conversationStatus === ModelStatus.CONVERSATION_LOADING
          ? "LOADING..."
          : conversationStatus === ModelStatus.READY
            ? "ONLINE"
            : "ERROR";

  return (
    <Fragment>
      <PageContent
        title={`JARVIS`}
        statusBar={{
          [`VERSION_${version}`]: false,
          [`STATUS: ${statusText}`]: true,
        }}
        button={{
          to: "/mcp",
          iconLeft: <McpIcon />,
          children: "MCP_SETTINGS",
        }}
      >
        {ui === "jarvis" ? (
          <Jarvis />
        ) : (
          <Chat onSubmitPrompt={submit} statusText={statusText} className="" />
        )}
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
          <button
            onClick={() => {
              if (mute) {
                setMute(false);
              } else {
                setMute(true);
                abortSpeaker();
              }
            }}
            className="cursor-pointer"
          >
            AUDIO_OUTPUT: {mute ? "MUTED" : "ENABLED"}
          </button>
        </div>
      </div>

      <div className="fixed right-8 bottom-8">
        <button
          onClick={() => setUi(ui === "jarvis" ? "chat" : "jarvis")}
          className="group relative flex items-center space-x-2 rounded-lg border border-cyan-500/30 bg-slate-900/80 px-4 py-2 font-mono text-xs text-cyan-400 transition-all duration-300 hover:border-cyan-400/60 hover:bg-slate-800/90 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <div
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              ui === "jarvis"
                ? "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            }`}
          />
          <span className="transition-all duration-300 group-hover:text-cyan-300">
            {ui === "jarvis" ? "JARVIS" : "CHAT"}
          </span>
          <div className="text-slate-500 group-hover:text-slate-400">→</div>
          <span className="text-slate-400 transition-all duration-300 group-hover:text-cyan-300">
            {ui === "jarvis" ? "CHAT" : "JARVIS"}
          </span>
        </button>
      </div>
    </Fragment>
  );
}

export default ChatPage;
