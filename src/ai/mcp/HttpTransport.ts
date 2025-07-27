import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { sanitizeUrl } from "strict-url-sanitise";

import type { McpTransport } from "./McpServer";

export interface HttpTransportConfig {
  url: string;
  customHeaders?: Record<string, string>;
  requestInit?: RequestInit;
}

export class HttpTransport implements McpTransport {
  private config: HttpTransportConfig;
  private transport: Transport | null = null;
  private connected = false;

  constructor(config: HttpTransportConfig) {
    this.config = {
      customHeaders: {},
      ...config,
    };
  }

  async connect(): Promise<Transport> {
    if (this.connected && this.transport) {
      return this.transport;
    }

    const options = {
      requestInit: {
        headers: {
          Accept: "application/json",
          ...this.config.customHeaders,
        },
        ...this.config.requestInit,
      },
    };

    const sanitizedUrl = sanitizeUrl(this.config.url);
    const targetUrl = new URL(sanitizedUrl);

    this.transport = new StreamableHTTPClientTransport(targetUrl, options);
    this.connected = true;
    return this.transport;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default HttpTransport;
