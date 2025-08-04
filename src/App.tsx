import AgentContextProvider from "@ai/agentContext/AgentContextProvider";
import { McpServerContextProvider } from "@ai/mcp/react/McpServerContextProvider";
import { Background } from "@theme";
import ConversationProvider from "@utils/conversation/ConversationContextProvider";
import Router, { Route } from "preact-router";

import ImageToText from "./ImageToText";
import TextGeneration from "./TextGeneration";
import ChatPage from "./pages/ChatPage";
import McpPage from "./pages/McpPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import TakePictureModal from "./ui/mcp/TakePictureModal";

/**
 * TODO:
 * - Jarvis mode: VAD listens for "Jarvis". If so start with "Yes, Sir? How can I help you with" (already added to the conversation before first prompt)
 * - Also add an "EndConversation" tool that ends the current conversation and goes back to "listening" for Jarvis
 */

function App() {
  return (
    <McpServerContextProvider>
      <AgentContextProvider>
        <ConversationProvider>
          <Background />
          <Router>
            <Route path="/" component={ChatPage} />
            <Route path="/mcp" component={McpPage} />
            <Route path="/oauth/callback" component={OAuthCallbackPage} />
            <Route path="/imgtotext" component={ImageToText} />
            <Route path="/textgen" component={TextGeneration} />
          </Router>
          <TakePictureModal />
        </ConversationProvider>
      </AgentContextProvider>
    </McpServerContextProvider>
  );
}

export default App;
