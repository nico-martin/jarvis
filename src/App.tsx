import { McpServerContextProvider } from "@ai/mcp/react/McpServerContextProvider";
import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import ChatPage from "./pages/ChatPage";
import McpPage from "./pages/McpPage";

function App() {
  return (
    <McpServerContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/mcp" element={<McpPage />} />
        </Routes>
      </Router>
    </McpServerContextProvider>
  );
}

export default App;
