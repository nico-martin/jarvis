import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface McpTransport {
  connect(): Promise<Transport>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  isAuthenticating?(): boolean;
}
