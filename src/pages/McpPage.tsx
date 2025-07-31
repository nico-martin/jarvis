import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import McpOverview from "@ui/mcp/McpOverview";
import React from "react";
import { Link } from "react-router-dom";

export function McpPage() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* JARVIS-style animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-black to-cyan-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,162,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(0,162,255,0.05)_50%,transparent_70%)] animate-pulse" />
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,162,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,162,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      
      {/* Corner decorative elements */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-blue-400/50" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-blue-400/50" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-blue-400/50" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-blue-400/50" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="p-4 pt-16">
          {/* HUD header */}
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 border border-blue-400/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,162,255,0.2)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-mono font-bold text-blue-300 drop-shadow-[0_0_10px_rgba(0,162,255,0.8)]">
                  MCP_SERVERS_CONTROL
                </h1>
                <p className="mt-1 text-lg font-mono text-blue-400/80">
                  MODEL_CONTEXT_PROTOCOL_MANAGEMENT_INTERFACE
                </p>
              </div>
              <Link
                to="/"
                className="flex items-center gap-2 border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm px-4 py-2 text-lg font-mono text-blue-300 transition-all duration-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] hover:border-blue-300"
              >
                <ChatBubbleLeftRightIcon width="1.25em" /> RETURN_TO_CHAT
              </Link>
            </div>
            
            {/* Technical status bar */}
            <div className="mt-3 flex justify-between items-center text-sm font-mono text-blue-300/60 border-t border-blue-400/20 pt-2">
              <span>SYSTEM_STATUS: ACTIVE</span>
              <span className="animate-pulse">MONITORING: ENABLED</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          <McpOverview />
        </div>
      </div>
    </div>
  );
}

export default McpPage;
