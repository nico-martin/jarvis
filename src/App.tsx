import { McpServerContextProvider } from "@ai/mcp/react/McpServerContextProvider";
import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import ChatPage from "./pages/ChatPage";
import McpPage from "./pages/McpPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import TakePictureModal from "./ui/mcp/TakePictureModal";

function App() {
  return (
    <McpServerContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        </Routes>
      </Router>
      <TakePictureModal />
    </McpServerContextProvider>
  );
}

export default App;
