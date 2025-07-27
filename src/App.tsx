import ConversationWebLlm from "@ai/llm/webLlm/ConversationWebLlm";
import { HttpTransport, McpServer } from "@ai/mcp";
import SpeechToText from "@ai/speechToText/SpeechToText";
import Kokoro from "@ai/textToSpeech/kokoro/Kokoro";
import { MessageRole, PartialResponseType } from "@ai/types";
import VoiceActivityDetection, {
  VoiceActivityDetectionStatus,
} from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { Button } from "@theme";
import { Chat } from "@ui/chat/Chat";
import McpSettings from "@ui/mcp/McpSettings";
import React from "react";
import { v4 as uuidv4 } from "uuid";

const SYSTEM_PROMPT =
  "You are Alfred, a distinguished English butler. Respond with proper etiquette, formality, and helpfulness befitting a gentleman's gentleman.";

const INSTRUCTIONS = ["My Name is Nico Martin", "never use ellipsis (...)"];

function App() {
  const [mute, setMute] = React.useState<boolean>(false);
  const [mcpSettingsOpen, setMcpSettingsOpen] = React.useState<boolean>(false);
  const [speakerAbortController, setSpeakerAbortController] = React.useState(
    () => new AbortController()
  );

  const conversation = React.useMemo(
    () =>
      new ConversationWebLlm(
        SYSTEM_PROMPT + "\n\n" + INSTRUCTIONS.join("\n")
        //{ log: console.log }
      ),
    []
  );

  const speechToText = React.useMemo(() => {
    const stt = new SpeechToText();
    stt.preload();
    return stt;
  }, []);

  const vad = React.useMemo(() => {
    const vad = new VoiceActivityDetection();
    vad.preload();
    vad.setCallbacks({
      onSpeechChunk: (buffer, timing) => {
        timing.duration > 200 &&
          speechToText
            .generate(buffer)
            .then((text) => text !== "[BLANK_AUDIO]" && submit(text));
      },
    });
    return vad;
  }, [speechToText]);

  const messages = React.useSyncExternalStore(
    (cb) => conversation.onMessagesChange(cb),
    () => conversation.messages
  );

  const status = React.useSyncExternalStore(
    (cb) => conversation.onStatusChange(cb),
    () => conversation.status
  );

  const vadStatus = React.useSyncExternalStore(
    (cb) => vad.onStatusChange(cb),
    () => vad.status
  );

  const tts = React.useMemo(() => {
    const k = new Kokoro();
    k.preload();
    return k;
  }, []);

  const submit = (prompt: string) =>
    conversation.processPrompt(
      {
        id: uuidv4(),
        text: prompt,
        role: MessageRole.USER,
      },
      (part) =>
        part.type === PartialResponseType.TEXT &&
        !mute &&
        tts.speak(part.text, speakerAbortController.signal)
    );

  const c = async () => {
    const transport = new HttpTransport({
      url: "https://memory-mcp.nico.dev/mcp",
    });

    const mcp = new McpServer({
      clientConfig: { name: "Memories", version: "1.0.0" },
      autoReconnect: true,
    });

    await mcp.setTransport(transport);
    await mcp.connect();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-stone-200 p-4">
      <McpSettings open={mcpSettingsOpen} setOpen={setMcpSettingsOpen} />
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
        openMcpSettings={() => setMcpSettingsOpen(true)}
      />
    </div>
  );
}

export default App;
