import { McpState } from "@ai/mcp/McpServer";
import type { McpServerWithState } from "@ai/mcp/react/types";
import useMcpServer from "@ai/mcp/react/useMcpServer";
import { McpServerStoreBuiltIn, McpServerStoreHttp } from "@ai/types";
import { PowerIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@theme";
import cn from "@utils/classnames";
import React from "react";

const getStateColor = (state: McpState) => {
  switch (state) {
    case McpState.READY:
      return "bg-green-50 text-green-700 border-green-200";
    case McpState.CONNECTING:
    case McpState.LOADING:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case McpState.FAILED:
      return "bg-red-50 text-red-700 border-red-200";
    case McpState.IDLE:
      return "bg-gray-50 text-gray-700 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStateIcon = (state: McpState) => {
  switch (state) {
    case McpState.READY:
      return "●";
    case McpState.CONNECTING:
    case McpState.LOADING:
      return "◐";
    case McpState.FAILED:
      return "●";
    case McpState.IDLE:
      return "○";
    default:
      return "○";
  }
};

const getStateText = (state: McpState) => {
  switch (state) {
    case McpState.READY:
      return "Ready";
    case McpState.CONNECTING:
      return "Connecting";
    case McpState.LOADING:
      return "Loading";
    case McpState.FAILED:
      return "Failed";
    case McpState.IDLE:
      return "Idle";
    default:
      return state;
  }
};

function McpServerHeader({
  serverInfo,
}: {
  serverInfo: (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState;
}) {
  const isBuiltin = "serverType" in serverInfo;

  const { removeHttpServer, updateServerConfig } = useMcpServer();

  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
              getStateColor(serverInfo.state)
            )}
          >
            <span className="mr-1">{getStateIcon(serverInfo.state)}</span>
            {getStateText(serverInfo.state)}
          </span>

          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
              {
                "border-blue-200 bg-blue-50 text-blue-700": serverInfo.active,
                "border-gray-200 bg-gray-50 text-gray-600": !serverInfo.active,
              }
            )}
          >
            {serverInfo.active ? "Active" : "Inactive"}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {serverInfo.name}
              </h3>
              {serverInfo.server && (
                <span className="text-sm text-gray-500">
                  ({serverInfo.activeTools.length}/
                  {serverInfo.server.tools.length} tool
                  {serverInfo.server.tools.length !== 1 ? "s" : ""} active)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isBuiltin
                ? `Built-in • ${(serverInfo as any).serverType}`
                : `HTTP • ${(serverInfo as any).url}`}
            </p>
            {serverInfo.error && (
              <p className="mt-1 text-xs text-red-600">
                Error: {serverInfo.error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            title={serverInfo.active ? "Deactivate server" : "Activate server"}
          >
            <PowerIcon width="1em" />
          </Button>

          {!isBuiltin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeHttpServer((serverInfo as any).url)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Remove server"
            >
              <TrashIcon width="1em" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default McpServerHeader;
