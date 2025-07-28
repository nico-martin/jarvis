import { BrowserOAuthClientProvider } from "@ai/mcp/auth/browser-provider.js";
import { McpTransport } from "@ai/mcp/types";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { sanitizeUrl } from "strict-url-sanitise";

export interface HttpTransportConfig {
  url: string;
  customHeaders?: Record<string, string>;
  requestInit?: RequestInit;
  authClientName?: string;
  authClientUri?: string;
  authCallbackUrl?: string;
}

export class HttpTransport implements McpTransport {
  private config: HttpTransportConfig;
  private transport: Transport | null = null;
  private connected = false;
  private authProvider: BrowserOAuthClientProvider | null = null;
  private isAuthenticating = false;

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

    await this.createTransport();
    this.connected = true;
    return this.transport!;
  }

  private async createTransport(): Promise<void> {
    // Create auth provider lazily when needed
    if (!this.authProvider) {
      this.authProvider = new BrowserOAuthClientProvider(this.config.url, {
        clientName: this.config.authClientName || "MCP Client",
        clientUri:
          this.config.authClientUri ||
          (typeof window !== "undefined" ? window.location.origin : ""),
        callbackUrl:
          this.config.authCallbackUrl ||
          (typeof window !== "undefined"
            ? new URL("/oauth/callback", window.location.origin).toString()
            : "/oauth/callback"),
      });
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.config.customHeaders,
    };

    // Add auth token if available
    const tokens = await this.authProvider.tokens();
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }

    const options = {
      requestInit: {
        headers,
        ...this.config.requestInit,
      },
    };

    const sanitizedUrl = sanitizeUrl(this.config.url);
    const targetUrl = new URL(sanitizedUrl);

    const baseTransport = new StreamableHTTPClientTransport(targetUrl, options);
    this.transport = this.createAuthInterceptor(baseTransport);
  }

  private createAuthInterceptor(
    baseTransport: StreamableHTTPClientTransport
  ): Transport {
    // Create a proxy that intercepts property access
    return new Proxy(baseTransport, {
      set: (target, prop, value) => {
        if (prop === "onmessage" && typeof value === "function") {
          console.log("Intercepting onmessage setter");
          const originalCallback = value;

          // Replace with our intercepting callback
          const interceptingCallback = (message: any, extra?: any) => {
            console.log("Message intercepted:", message);

            // Check for JSON-RPC auth errors
            if (message && typeof message === "object" && "error" in message) {
              const error = message.error;
              if (this.isAuthError(error) && !this.isAuthenticating) {
                console.log("Auth error detected, starting auth flow...");

                this.performAuthFlow()
                  .then(async () => {
                    console.log("Auth completed, recreating transport");
                    await this.createTransport();
                  })
                  .catch((authError) => {
                    console.error("Auth flow failed:", authError);
                  });
              }
            }

            // Call the original callback
            originalCallback(message, extra);
          };

          // Set the intercepting callback on the target
          (target as any)[prop] = interceptingCallback;
          return true;
        }

        // For all other properties, set normally
        (target as any)[prop] = value;
        return true;
      },
    });
  }

  private isAuthError(error: any): boolean {
    // Check for JSON-RPC auth errors
    if (error?.code === -32603 && error?.message?.includes("Unauthorized")) {
      return true;
    }
    if (
      error?.code === -32603 &&
      error?.message?.includes("Bearer token required")
    ) {
      return true;
    }

    // Check for HTTP status codes
    return error?.status === 401 || error?.status === 403;
  }

  private async performAuthFlow(): Promise<void> {
    if (this.isAuthenticating || !this.authProvider) {
      return;
    }

    this.isAuthenticating = true;
    try {
      console.log("Starting OAuth flow...");
      const result = await auth(this.authProvider, {
        serverUrl: this.config.url,
      });

      if (result === "AUTHORIZED") {
        console.log("Authentication successful");
      } else {
        throw new Error(`Authentication failed with result: ${result}`);
      }
    } finally {
      this.isAuthenticating = false;
    }
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
