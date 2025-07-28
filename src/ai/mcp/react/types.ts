import { McpServer } from "@ai/mcp";
import {
  McpServerStore,
  McpServerStoreBuiltIn,
  McpServerStoreHttp,
} from "@ai/types";

export interface McpServerContextType {
  httpServers: Array<McpServerStoreHttp & { server: McpServer }>;
  builtinServers: Array<McpServerStoreBuiltIn & { server: McpServer }>;
  isLoading: boolean;
  error: string | null;
  addHttpServer: (name: string, url: string) => Promise<void>;
  removeHttpServer: (url: string) => void;
  updateServerConfig: (serverConfig: McpServerStore) => void;
}
