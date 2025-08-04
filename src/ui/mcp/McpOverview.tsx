import { McpState } from "@ai/mcp/McpServer";
import useMcpServer from "@ai/mcp/react/useMcpServer";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ContentBox, Message } from "@theme";
import cn from "@utils/classnames";
import { useState } from "preact/hooks";

import AddHttpServer from "./AddHttpServer";
import CallTool from "./CallTool";
import McpPrompts from "./components/McpPrompts";
import McpResources from "./components/McpResources";
import McpServerHeader from "./components/McpServerHeader";
import McpTools from "./components/McpTools";

function McpOverview({ className = "" }: { className?: string }) {
  const { httpServers, builtinServers, error, updateServerConfig } =
    useMcpServer();
  const [callToolModal, setCallToolModal] = useState<{
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
      <div className={cn(className, "relative")}>
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
      <ContentBox>
        <AddHttpServer />
      </ContentBox>

      <div className="space-y-4">
        {unifiedServers.length === 0 ? (
          <ContentBox className="p-12 text-center">
            <p className="text-text-bright text-lg">NO_MCP_SERVERS_DETECTED</p>
            <p className="text-text/80 mt-2 text-sm">
              INITIALIZE_HTTP_SERVER_CONNECTION_ABOVE
            </p>
          </ContentBox>
        ) : (
          unifiedServers.map((serverInfo) => (
            <ContentBox
              key={serverInfo.name}
              header={<McpServerHeader serverInfo={serverInfo} />}
            >
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
            </ContentBox>
          ))
        )}
      </div>

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
