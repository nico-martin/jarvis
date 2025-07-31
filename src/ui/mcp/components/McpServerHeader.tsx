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
      return "bg-primary500/20 text-primary-400 border-primary400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
    default:
      return "bg-primary500/20 text-primary-400 border-primary400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
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
      return "";
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
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span
          className={cn(
            "inline-flex items-center border px-2 py-1 text-xs font-medium backdrop-blur-sm",
            getStateColor(serverInfo.state)
          )}
        >
          <span className="mr-1">{getStateIcon(serverInfo.state)}</span>
          {getStateText(serverInfo.state)}
        </span>

        <span
          className={cn(
            "inline-flex items-center border px-2 py-1 text-xs font-medium backdrop-blur-sm",
            {
              "border-primary400/50 bg-primary500/20 text-primary-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]":
                serverInfo.active,
              "border-primary400/30 bg-primary950/10 text-primary-400/60":
                !serverInfo.active,
            }
          )}
        >
          {serverInfo.active ? "ACTIVE" : "INACTIVE"}
        </span>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-primary-300 text-lg font-semibold tracking-wider uppercase">
              {serverInfo.name}
            </h3>
            {serverInfo.server && (
              <span className="text-primary-400/80 text-sm">
                ({serverInfo.activeTools.length}/
                {serverInfo.server.tools.length} TOOL
                {serverInfo.server.tools.length !== 1 ? "S" : ""} ACTIVE)
              </span>
            )}
          </div>
          <p className="text-primary-400/60 text-xs">
            {isBuiltin
              ? `BUILTIN_MODULE • ${(serverInfo as any).serverType.toUpperCase()}`
              : `HTTP_ENDPOINT • ${(serverInfo as any).url}`}
          </p>
          {serverInfo.error && (
            <p className="mt-1 text-xs text-red-400">
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
          color={serverInfo.active ? "primary" : "secondary"}
          title={serverInfo.active ? "DEACTIVATE_SERVER" : "ACTIVATE_SERVER"}
        >
          <PowerIcon width="1em" />
        </Button>

        {!isBuiltin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeHttpServer((serverInfo as any).url)}
            color="danger"
            title="TERMINATE_CONNECTION"
          >
            <TrashIcon width="1em" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default McpServerHeader;
