import { McpServerStoreBuiltIn, McpServerStoreHttp } from "@ai/types";
import localStorage from "@utils/LocalStorage";
import {
  MCP_BUILTIN_SERVERS_STORAGE_KEY,
  MCP_SERVERS_STORAGE_KEY,
} from "@utils/constants";

import { defaultBuiltinServers } from "../mcpServers/builtinMcp";

export const saveBuiltInServers = (
  servers: Array<McpServerStoreBuiltIn> = []
) => localStorage.setItem(MCP_BUILTIN_SERVERS_STORAGE_KEY, servers);

export const getBuiltInServers = (): Array<McpServerStoreBuiltIn> => {
  const savedServers =
    localStorage.getItem<Array<McpServerStoreBuiltIn>>(
      MCP_BUILTIN_SERVERS_STORAGE_KEY
    ) ?? [];

  return defaultBuiltinServers.map((server) => {
    const saved =
      savedServers.find((s) => s.serverType === server.serverType) || {};
    return { ...server, ...saved };
  });
};

export const saveHttpServers = (servers: Array<McpServerStoreHttp> = []) =>
  localStorage.setItem(MCP_SERVERS_STORAGE_KEY, servers);

export const getHttpServers = () =>
  localStorage.getItem<Array<McpServerStoreHttp>>(MCP_SERVERS_STORAGE_KEY) ||
  [];
