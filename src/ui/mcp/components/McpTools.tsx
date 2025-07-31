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
      <h4 className="mb-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
        TOOLS_AVAILABLE ({activeTools.length}/{tools.length} ACTIVE)
      </h4>
      <div className="space-y-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="border border-blue-400/30 bg-blue-950/10 backdrop-blur-sm p-4 shadow-[0_0_15px_rgba(0,162,255,0.1)]"
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
                  <h5 className="text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
                    {tool.name}
                  </h5>
                  <span className="text-xs text-blue-400/80 font-mono">
                    {activeTools.includes(tool.name)
                      ? "(ACTIVE)"
                      : "(INACTIVE)"}
                  </span>
                </div>
                {tool.description && (
                  <p className="mt-1 text-sm text-blue-400/80 font-mono">
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
                  EXECUTE_TOOL
                </Button>
              </div>
            </div>

            {tool.inputSchema && (
              <div className="mt-3">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-blue-300 font-mono hover:text-blue-200 uppercase tracking-wider">
                    INPUT_SCHEMA
                  </summary>
                  <div className="mt-2 border border-blue-400/20 bg-black/30 p-3 text-xs">
                    <pre className="overflow-x-auto text-blue-300/80 font-mono">
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
