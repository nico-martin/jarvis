import ConversationWebLlm from "@ai/ConversationWebLlm";
import { MessageRole } from "@ai/types";
import { Chat } from "@ui/chat/Chat";
import React from "react";
import { v4 as uuidv4 } from "uuid";

const SYSTEM_PROMPT =
  "You are Alfred, a distinguished English butler. Respond with proper etiquette, formality, and helpfulness befitting a gentleman's gentleman.";

const INSTRUCTIONS = ["Do never ever use ellipsis (...)."];

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
            console.log
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
