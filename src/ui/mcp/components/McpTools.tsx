import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Button, Checkbox } from "@theme";
import cn from "@utils/classnames";

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
      <h4 className="text-primary-300 mb-3 text-sm font-medium tracking-wider uppercase">
        TOOLS_AVAILABLE ({activeTools.length}/{tools.length} ACTIVE)
      </h4>
      <div className="space-y-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="border-primary-400/30 bg-primary-950/10 border p-4"
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
                  <h5 className="text-primary-300 text-sm font-medium tracking-wider uppercase">
                    {tool.name}
                  </h5>
                  <span className="text-primary-400/80 text-xs">
                    {activeTools.includes(tool.name)
                      ? "(ACTIVE)"
                      : "(INACTIVE)"}
                  </span>
                </div>
                {tool.description && (
                  <p className="text-primary-400/80 mt-1 text-sm">
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
                  <summary className="text-primary-300 hover:text-primary-200 cursor-pointer text-xs font-medium tracking-wider uppercase">
                    INPUT_SCHEMA
                  </summary>
                  <div className="border-primary-400/20 mt-2 border bg-black/30 p-3 text-xs">
                    <pre className="text-primary-300/80 scrollbar-hide overflow-x-auto">
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
