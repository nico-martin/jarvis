import AgentContextProvider from "@ai/agentContext/AgentContextProvider";
import { McpServerContextProvider } from "@ai/mcp/react/McpServerContextProvider";
import { Background } from "@theme";
import Router, { Route } from "preact-router";
import { Toaster } from "react-hot-toast";

import ChatPage from "./pages/ChatPage";
import McpPage from "./pages/McpPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import TakePictureModal from "./ui/mcp/TakePictureModal";

function App() {
  return (
    <McpServerContextProvider>
      <AgentContextProvider>
        <Background />
        <Router>
          <Route path="/" component={ChatPage} />
          <Route path="/mcp" component={McpPage} />
          <Route path="/oauth/callback" component={OAuthCallbackPage} />
        </Router>
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          containerClassName="!right-8 !bottom-26"
        />
        <TakePictureModal />
      </AgentContextProvider>
    </McpServerContextProvider>
  );
}

export default App;
