import React from "react";
import { v4 as uuidv4 } from "uuid";

import { Message, MessageRole } from "./types";
import { Chat } from "./ui/chat/Chat";

function App() {
  const [messages, setMessages] = React.useState<Array<Message>>([]);
  return (
    <div className="flex h-screen items-center justify-center bg-stone-200 p-4">
      <Chat
        onSubmitPrompt={(prompt) =>
          setMessages((messages) => [
            ...messages,
            { id: uuidv4(), text: prompt, role: MessageRole.USER },
          ])
        }
        messages={messages}
        className="h-full max-h-full w-1/2"
      />
    </div>
  );
}

export default App;
