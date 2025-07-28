import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Button, Checkbox } from "@theme";
import cn from "@utils/classnames";
import React from "react";

function McpTools({
  className = "",
  tools = [],
  activeTools,
  serverId,
  handleToggleTool,
  openToolModal,
  serverActive,
}: {
  className?: string;
  tools: Array<Tool>;
  activeTools: Array<string>;
  serverId: string;
  handleToggleTool: (name: string, checked: boolean) => void;
  openToolModal: (tool: Tool) => void;
  serverActive: boolean;
}) {
  return (
    <div className={cn("px-6 py-4", className)}>
      <h4 className="mb-3 text-sm font-medium text-gray-700">
        Tools ({activeTools.length}/{tools.length} active)
      </h4>
      <div className="space-y-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="rounded-md border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`tool-${tool.name}-${serverId}`}
                    name={`tool-${tool.name}`}
                    value={tool.name}
                    label=""
                    checked={activeTools.includes(tool.name)}
                    onChange={(checked) => handleToggleTool(tool.name, checked)}
                  />
                  <h5 className="text-sm font-medium text-gray-900">
                    {tool.name}
                  </h5>
                  <span className="text-xs text-gray-500">
                    {activeTools.includes(tool.name)
                      ? "(Active)"
                      : "(Inactive)"}
                  </span>
                </div>
                {tool.description && (
                  <p className="mt-1 text-sm text-gray-600">
                    {tool.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openToolModal(tool)}
                  disabled={!activeTools.includes(tool.name) || !serverActive}
                >
                  Call Tool
                </Button>
              </div>
            </div>

            {tool.inputSchema && (
              <div className="mt-3">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
                    Input Schema
                  </summary>
                  <div className="mt-2 rounded border bg-white p-3 text-xs">
                    <pre className="overflow-x-auto text-gray-800">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpTools;
