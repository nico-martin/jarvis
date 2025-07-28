import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import McpOverview from "@ui/mcp/McpOverview";
import React from "react";
import { Link } from "react-router-dom";

export function McpPage() {
  return (
    <div className="min-h-screen bg-stone-200">
      <div className="mx-auto max-w-6xl">
        <div className="p-4 pt-16">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">MCP Servers</h1>
              <p className="mt-1 text-sm text-stone-600">
                Manage and monitor your Model Context Protocol servers
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <ChatBubbleLeftRightIcon width="1.25em" /> Back to Chat
            </Link>
          </div>
          <McpOverview />
        </div>
      </div>
    </div>
  );
}

export default McpPage;
