import { McpState } from "@ai/mcp/McpServer";
import useMcpServer from "@ai/mcp/react/useMcpServer";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Message } from "@theme";
import cn from "@utils/classnames";
import React from "react";

import AddHttpServer from "./AddHttpServer";
import CallTool from "./CallTool";
import McpPrompts from "./components/McpPrompts";
import McpResources from "./components/McpResources";
import McpServerHeader from "./components/McpServerHeader";
import McpTools from "./components/McpTools";

function McpOverview({ className = "" }: { className?: string }) {
  const { httpServers, builtinServers, error, updateServerConfig } =
    useMcpServer();
  const [callToolModal, setCallToolModal] = React.useState<{
    isOpen: boolean;
    server: any;
    tool: any;
  }>({
    isOpen: false,
    server: null,
    tool: null,
  });

  const handleToggleTool = (
    serverInfo: any,
    toolName: string,
    checked?: boolean
  ) => {
    const isActive = checked ?? !serverInfo.activeTools.includes(toolName);
    const newActiveTools = isActive
      ? [
          ...serverInfo.activeTools.filter((name: string) => name !== toolName),
          toolName,
        ]
      : serverInfo.activeTools.filter((name: string) => name !== toolName);

    updateServerConfig({
      ...serverInfo,
      activeTools: newActiveTools,
    });
  };

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="py-12 text-center">
          <Message
            type="error"
            title="Error Loading Servers"
            className="mx-auto max-w-md"
          >
            {error}
          </Message>
        </div>
      </div>
    );
  }

  const unifiedServers = [...builtinServers, ...httpServers];

  return (
    <div className={cn("space-y-6", className)}>
      <AddHttpServer />

      <div className="space-y-4">
        {unifiedServers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-500">No MCP servers configured</p>
            <p className="mt-2 text-sm text-gray-400">
              Add an HTTP server above to get started
            </p>
          </div>
        ) : (
          unifiedServers.map((serverInfo) => (
            <div
              key={serverInfo.name}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <McpServerHeader serverInfo={serverInfo} />

              {serverInfo.active && serverInfo.server && (
                <>
                  {serverInfo.server.tools.length > 0 && (
                    <McpTools
                      tools={serverInfo.server.tools}
                      activeTools={serverInfo.activeTools}
                      serverId={serverInfo.name}
                      handleToggleTool={(toolName, checked) =>
                        handleToggleTool(serverInfo, toolName, checked)
                      }
                      openToolModal={(tool: Tool) =>
                        setCallToolModal({
                          isOpen: true,
                          server: serverInfo.server,
                          tool,
                        })
                      }
                      serverActive={serverInfo.state === McpState.READY}
                    />
                  )}

                  {serverInfo.server.resources.length > 0 && (
                    <McpResources resources={serverInfo.server.resources} />
                  )}

                  {serverInfo.server.prompts.length > 0 && (
                    <McpPrompts prompts={serverInfo.server.prompts} />
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Call Tool Modal */}
      {callToolModal.isOpen && callToolModal.server && callToolModal.tool && (
        <CallTool
          isOpen={callToolModal.isOpen}
          onClose={() =>
            setCallToolModal({ isOpen: false, server: null, tool: null })
          }
          server={callToolModal.server}
          tool={callToolModal.tool}
        />
      )}
    </div>
  );
}

export default McpOverview;
