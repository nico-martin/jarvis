import ConversationWebLlm from "@ai/ConversationWebLlm";
import Kokoro from "@ai/tts/kokoro/Kokoro";
import { MessageRole, PartialResponseType } from "@ai/types";
import { Chat } from "@ui/chat/Chat";
import React from "react";
import { v4 as uuidv4 } from "uuid";

const SYSTEM_PROMPT =
  "You are Alfred, a distinguished English butler. Respond with proper etiquette, formality, and helpfulness befitting a gentleman's gentleman.";

const INSTRUCTIONS = ["Call me Mr. Martin", "never use ellipsis (...)"];

function App() {
  const conversation = React.useMemo(
    () =>
      new ConversationWebLlm(
        SYSTEM_PROMPT + "\n\n" + INSTRUCTIONS.join("\n")
        //{ log: console.log }
      ),
    []
  );

  const messages = React.useSyncExternalStore(
    (cb) => conversation.onMessagesChange(cb),
    () => conversation.messages
  );

  const status = React.useSyncExternalStore(
    (cb) => conversation.onStatusChange(cb),
    () => conversation.status
  );

  const tts = React.useMemo(() => new Kokoro(), []);
  const [abortController, setAbortController] = React.useState(
    () => new AbortController()
  );

  const handleStop = () => {
    abortController.abort();
    setAbortController(new AbortController());
  };

  return (
    <div className="flex h-screen items-center justify-center bg-stone-200 p-4">
      <Chat
        onSubmitPrompt={(prompt) => {
          conversation.processPrompt(
            {
              id: uuidv4(),
              text: prompt,
              role: MessageRole.USER,
            },
            (part) =>
              part.type === PartialResponseType.TEXT &&
              tts.speak(part.text, abortController.signal)
          );
        }}
        messages={messages}
        status={status}
        className="h-full max-h-full w-1/2"
      />
    </div>
  );
}

export default App;
