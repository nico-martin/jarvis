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
      return "bg-green-500/20 text-green-400 border-green-400/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
    case McpState.CONNECTING:
    case McpState.LOADING:
      return "bg-yellow-500/20 text-yellow-400 border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]";
    case McpState.FAILED:
      return "bg-red-500/20 text-red-400 border-red-400/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
    case McpState.IDLE:
      return "bg-blue-500/20 text-blue-400 border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
    default:
      return "bg-blue-500/20 text-blue-400 border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
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
      return "ONLINE";
    case McpState.CONNECTING:
      return "CONNECTING";
    case McpState.LOADING:
      return "INITIALIZING";
    case McpState.FAILED:
      return "ERROR";
    case McpState.IDLE:
      return "STANDBY";
    default:
      return state.toUpperCase();
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
    <div className="border-b border-blue-400/20 px-6 py-4 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span
            className={cn(
              "inline-flex items-center border px-2 py-1 text-xs font-medium font-mono backdrop-blur-sm",
              getStateColor(serverInfo.state)
            )}
          >
            <span className="mr-1">{getStateIcon(serverInfo.state)}</span>
            {getStateText(serverInfo.state)}
          </span>

          <span
            className={cn(
              "inline-flex items-center border px-2 py-1 text-xs font-medium font-mono backdrop-blur-sm",
              {
                "border-blue-400/50 bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]": serverInfo.active,
                "border-blue-400/30 bg-blue-950/10 text-blue-400/60": !serverInfo.active,
              }
            )}
          >
            {serverInfo.active ? "ACTIVE" : "INACTIVE"}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-blue-300 font-mono uppercase tracking-wider">
                {serverInfo.name}
              </h3>
              {serverInfo.server && (
                <span className="text-sm text-blue-400/80 font-mono">
                  ({serverInfo.activeTools.length}/
                  {serverInfo.server.tools.length} TOOL
                  {serverInfo.server.tools.length !== 1 ? "S" : ""} ACTIVE)
                </span>
              )}
            </div>
            <p className="text-xs text-blue-400/60 font-mono">
              {isBuiltin
                ? `BUILTIN_MODULE • ${(serverInfo as any).serverType.toUpperCase()}`
                : `HTTP_ENDPOINT • ${(serverInfo as any).url}`}
            </p>
            {serverInfo.error && (
              <p className="mt-1 text-xs text-red-400 font-mono">
                ERROR: {serverInfo.error}
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
              "text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]":
                serverInfo.active,
              "text-green-400 hover:bg-green-500/20 hover:text-green-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]":
                !serverInfo.active,
            })}
            title={serverInfo.active ? "DEACTIVATE_SERVER" : "ACTIVATE_SERVER"}
          >
            <PowerIcon width="1em" />
          </Button>

          {!isBuiltin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeHttpServer((serverInfo as any).url)}
              className="text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              title="TERMINATE_CONNECTION"
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
