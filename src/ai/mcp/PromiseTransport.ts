import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";

import type { McpTransport } from "./McpServer";

export interface PromiseTransportConfig {
  /**
   * Function that executes MCP requests via promises
   * This could be a function that:
   * - Calls a local service/worker
   * - Executes code directly in the browser
   * - Communicates with a browser extension
   * - Uses WebRTC, WebSocket, or other protocols
   */
  executeRequest: (request: JSONRPCRequest) => Promise<JSONRPCResponse | JSONRPCError>;

  /**
   * Optional function to handle transport-level setup
   */
  onConnect?: () => Promise<void>;

  /**
   * Optional function to handle transport-level cleanup
   */
  onDisconnect?: () => Promise<void>;

  /**
   * Optional timeout for requests (default: 30000ms)
   */
  timeout?: number;
}

export class PromiseTransport implements McpTransport {
  private config: PromiseTransportConfig;
  private transport: PromiseTransportInstance | null = null;
  private connected = false;

  constructor(config: PromiseTransportConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  async connect(): Promise<Transport> {
    if (this.connected && this.transport) {
      return this.transport;
    }

    // Call setup function if provided
    if (this.config.onConnect) {
      await this.config.onConnect();
    }

    this.transport = new PromiseTransportInstance(this.config);
    this.connected = true;
    return this.transport;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }

    // Call cleanup function if provided
    if (this.config.onDisconnect) {
      await this.config.onDisconnect();
    }

    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

class PromiseTransportInstance implements Transport {
  private config: PromiseTransportConfig;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (response: JSONRPCResponse) => void;
      reject: (error: Error) => void;
      timeout: number;
    }
  >();

  // Transport event handlers
  public onmessage?: (message: JSONRPCMessage) => void;
  public onerror?: (error: Error) => void;
  public onclose?: () => void;

  constructor(config: PromiseTransportConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Promise transport is ready immediately
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      if (this.isRequest(message)) {
        // Handle request - execute via promise and send response
        const response = await this.executeRequest(message);

        // Notify message handler with the response
        if (this.onmessage) {
          this.onmessage(response);
        }
      } else if (this.isResponse(message)) {
        // Handle response - resolve pending request
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          pending.resolve(message);
        }
      } else {
        // Handle notification - just pass through
        if (this.onmessage) {
          this.onmessage(message);
        }
      }
    } catch (error) {
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  async close(): Promise<void> {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Transport closed"));
    }
    this.pendingRequests.clear();

    // Notify close handler
    if (this.onclose) {
      this.onclose();
    }
  }

  private async executeRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse | JSONRPCError> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      // Execute the request via the provided function
      this.config
        .executeRequest(request)
        .then((response) => {
          const pending = this.pendingRequests.get(request.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(request.id);
            pending.resolve(response);
          }
        })
        .catch((error) => {
          const pending = this.pendingRequests.get(request.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(request.id);
            pending.reject(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        });
    });
  }

  private isRequest(message: JSONRPCMessage): message is JSONRPCRequest {
    return "method" in message && "id" in message;
  }

  private isResponse(message: JSONRPCMessage): message is JSONRPCResponse {
    return "id" in message && ("result" in message || "error" in message);
  }
}

export default PromiseTransport;
