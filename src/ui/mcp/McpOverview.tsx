import useMcpServer from "@ai/mcp/react/useMcpServer";
import { PowerIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Loader, Message } from "@theme";
import AddHttpServer from "@ui/mcp/AddHttpServer";
import CallTool from "@ui/mcp/CallTool";
import cn from "@utils/classnames";
import React from "react";

function McpOverview({ className = "" }: { className?: string }) {
  const {
    httpServers,
    builtinServers,
    isLoading,
    error,
    addHttpServer,
    removeHttpServer,
    updateServerConfig,
  } = useMcpServer();
  const [callToolModal, setCallToolModal] = React.useState<{
    isOpen: boolean;
    server: any;
    tool: any;
  }>({
    isOpen: false,
    server: null,
    tool: null,
  });

  const handleRemoveServer = (url: string) => {
    removeHttpServer(url);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
          <Loader />
          <p className="text-lg text-gray-500">Loading MCP servers...</p>
        </div>
      </div>
    );
  }

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

  // Combine all servers for unified display
  const unifiedServers = [...builtinServers, ...httpServers];

  return (
    <div className={cn("space-y-6", className)}>
      <AddHttpServer onAddServer={addHttpServer} />

      {/* Unified Server List */}
      <div className="space-y-4">
        {unifiedServers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-500">No MCP servers configured</p>
            <p className="mt-2 text-sm text-gray-400">
              Add an HTTP server above to get started
            </p>
          </div>
        ) : (
          unifiedServers.map((serverInfo) => {
            const isBuiltin = "serverType" in serverInfo;
            const type = isBuiltin ? "builtin" : "http";

            return (
              <div
                key={`${type}-${serverInfo.name}`}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {/* Server Header with Settings */}
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full text-xs font-medium",
                          {
                            "bg-green-50 text-green-600": serverInfo.active,
                            "bg-red-50 text-red-600": !serverInfo.active,
                          }
                        )}
                      >
                        <span className="mr-1">●</span>
                      </span>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {serverInfo.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {isBuiltin
                            ? `Built-in • ${(serverInfo as any).serverType}`
                            : `HTTP • ${(serverInfo as any).url}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {serverInfo.server && (
                        <span className="text-sm text-gray-500">
                          {serverInfo.server.tools.length} tool
                          {serverInfo.server.tools.length !== 1 ? "s" : ""}
                        </span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateServerConfig({
                            ...serverInfo,
                            active: !serverInfo.active,
                          })
                        }
                        className={cn({
                          "text-amber-600 hover:bg-amber-50 hover:text-amber-700":
                            serverInfo.active,
                          "text-green-600 hover:bg-green-50 hover:text-green-700":
                            !serverInfo.active,
                        })}
                        title={
                          serverInfo.active
                            ? "Deactivate server"
                            : "Activate server"
                        }
                      >
                        <PowerIcon width="1em" />
                      </Button>

                      {!isBuiltin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRemoveServer((serverInfo as any).url)
                          }
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Remove server"
                        >
                          <TrashIcon width="1em" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Server Content - Only show if active and has tools/resources/prompts */}
                {serverInfo.active &&
                  serverInfo.server &&
                  (serverInfo.server.tools.length > 0 ||
                    serverInfo.server.resources.length > 0 ||
                    serverInfo.server.prompts.length > 0) && (
                    <>
                      {/* Tools Section */}
                      {serverInfo.server.tools.length > 0 && (
                        <div className="px-6 py-4">
                          <h4 className="mb-3 text-sm font-medium text-gray-700">
                            Tools ({serverInfo.server.tools.length})
                          </h4>
                          <div className="space-y-3">
                            {serverInfo.server.tools.map((tool) => (
                              <div
                                key={tool.name}
                                className="rounded-md border border-gray-200 bg-gray-50 p-4"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-900">
                                      {tool.name}
                                    </h5>
                                    {tool.description && (
                                      <p className="mt-1 text-sm text-gray-600">
                                        {tool.description}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setCallToolModal({
                                        isOpen: true,
                                        server: serverInfo.server,
                                        tool,
                                      })
                                    }
                                    //disabled={active.state !== McpState.READY}
                                  >
                                    Call Tool
                                  </Button>
                                </div>

                                {tool.inputSchema && (
                                  <div className="mt-3">
                                    <details className="group">
                                      <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
                                        Input Schema
                                      </summary>
                                      <div className="mt-2 rounded border bg-white p-3 text-xs">
                                        <pre className="overflow-x-auto text-gray-800">
                                          {JSON.stringify(
                                            tool.inputSchema,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    </details>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources Section */}
                      {serverInfo.server.resources.length > 0 && (
                        <div className="border-t border-gray-200 px-6 py-4">
                          <h4 className="mb-3 text-sm font-medium text-gray-700">
                            Resources ({serverInfo.server.resources.length})
                          </h4>
                          <div className="space-y-2">
                            {serverInfo.server.resources.map((resource) => (
                              <div
                                key={resource.uri}
                                className="rounded border bg-blue-50 p-2 text-sm"
                              >
                                <div className="font-medium text-blue-900">
                                  {resource.name || resource.uri}
                                </div>
                                {resource.description && (
                                  <div className="mt-1 text-blue-700">
                                    {resource.description}
                                  </div>
                                )}
                                <div className="mt-1 font-mono text-xs text-blue-600">
                                  {resource.uri}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prompts Section */}
                      {serverInfo.server.prompts.length > 0 && (
                        <div className="border-t border-gray-200 px-6 py-4">
                          <h4 className="mb-3 text-sm font-medium text-gray-700">
                            Prompts ({serverInfo.server.prompts.length})
                          </h4>
                          <div className="space-y-2">
                            {serverInfo.server.prompts.map((prompt) => (
                              <div
                                key={prompt.name}
                                className="rounded border bg-purple-50 p-2 text-sm"
                              >
                                <div className="font-medium text-purple-900">
                                  {prompt.name}
                                </div>
                                {prompt.description && (
                                  <div className="mt-1 text-purple-700">
                                    {prompt.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
              </div>
            );
          })
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
