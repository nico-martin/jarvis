import { McpServer, McpState } from "@ai/mcp";
import {
  McpServerStore,
  McpServerStoreBuiltIn,
  McpServerStoreHttp,
} from "@ai/types";

export interface McpServerWithState {
  server: McpServer;
  state: McpState;
  error?: string;
  lastStateChange: Date;
}

export interface McpServerContextType {
  httpServers: Array<McpServerStoreHttp & McpServerWithState>;
  builtinServers: Array<McpServerStoreBuiltIn & McpServerWithState>;
  error: string | null;
  addHttpServer: (name: string, url: string) => Promise<void>;
  removeHttpServer: (url: string) => void;
  updateServerConfig: (serverConfig: McpServerStore) => void;
}
