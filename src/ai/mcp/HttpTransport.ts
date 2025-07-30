import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { sanitizeUrl } from "strict-url-sanitise";

import { BrowserOAuthClientProvider } from "./auth/browser-provider";
import { McpTransport } from "./types";

export interface HttpTransportConfig {
  url: string;
  customHeaders?: Record<string, string>;
  requestInit?: RequestInit;
  authClientName?: string;
  authClientUri?: string;
  authCallbackUrl?: string;
}

const AUTH_TIMEOUT = 5 * 60 * 1000; // // 5 minute
const USE_CORS_PROXY = false; // Set to false to disable CORS proxy

export class HttpTransport implements McpTransport {
  private config: HttpTransportConfig;
  private transport: Transport | null = null;
  private connected = false;
  private authProvider: BrowserOAuthClientProvider | null = null;
  private _isAuthenticating = false;

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

    // Try to create transport with existing auth token if available
    await this.createTransport();
    this.connected = true;
    return this.transport!;
  }

  private async createTransport(): Promise<void> {
    if (!this.authProvider) {
      this.authProvider = new BrowserOAuthClientProvider(this.config.url, {
        clientName: this.config.authClientName || "MCP Client",
        clientUri: this.config.authClientUri || window.location.origin,
        callbackUrl:
          this.config.authCallbackUrl ||
          new URL("/oauth/callback", window.location.origin).toString(),
        onLog: (level, message) => this.log(level, `[OAuth] ${message}`),
      });

      // Debug: Log the provider configuration
      this.log("debug", `Provider created with config:`, {
        serverUrl: this.config.url,
        clientName: this.config.authClientName || "MCP Client",
        clientUri: this.config.authClientUri || window.location.origin,
        callbackUrl:
          this.config.authCallbackUrl ||
          new URL("/oauth/callback", window.location.origin).toString(),
      });
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.config.customHeaders,
    };

    const tokens = await this.authProvider.tokens();
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }

    const options = {
      requestInit: {
        headers,
        ...this.config.requestInit,
      },
      fetch: this.createProxyFetch(),
    };

    const sanitizedUrl = sanitizeUrl(this.config.url);
    const targetUrl = new URL(sanitizedUrl);

    const baseTransport = new StreamableHTTPClientTransport(targetUrl, options);
    this.transport = this.createAuthInterceptor(baseTransport);
  }

  private createProxyFetch() {
    if (!USE_CORS_PROXY) {
      // Return regular fetch when CORS proxy is disabled
      return fetch;
    }

    const CORS_PROXY_URL = "https://cors.nico.dev";

    return async (url: string | URL, init?: RequestInit): Promise<Response> => {
      const targetUrl = url.toString();
      const proxyUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;

      this.log(
        "debug",
        `Proxying request through CORS proxy: ${targetUrl} -> ${proxyUrl}`
      );

      // Log token exchange requests
      if (targetUrl.includes("token")) {
        this.log("debug", `Token exchange request init:`, init);
      }

      const response = await fetch(proxyUrl, init);

      // Log token exchange responses
      if (targetUrl.includes("token")) {
        this.log("debug", `Token exchange response status:`, response.status);
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        this.log("debug", `Token exchange response body:`, responseText);
      }

      return response;
    };
  }

  private createAuthInterceptor(
    baseTransport: StreamableHTTPClientTransport
  ): Transport {
    const proxy = new Proxy(baseTransport, {
      set: (target, prop, value) => {
        if (prop === "onmessage" && typeof value === "function") {
          const originalCallback = value;
          (target as any)[prop] = (message: any, extra?: any) => {
            if (message && typeof message === "object" && "error" in message) {
              const error = message.error;
              if (this.isAuthError(error) && !this._isAuthenticating) {
                this.log("info", "Auth error detected, starting auth flow...");
                this.performAuthFlow().catch((authError) => {
                  this.log("error", "Auth flow failed:", authError);
                });
                // Don't continue processing this error message
                return;
              }
            }

            originalCallback(message, extra);
          };
          return true;
        }

        if (prop === "onerror" && typeof value === "function") {
          const originalErrorCallback = value;
          (target as any)[prop] = (error: Error) => {
            this.log("debug", "Transport onerror called:", error);

            if (this.isAuthError(error) && !this._isAuthenticating) {
              this.log(
                "info",
                "Auth error detected via onerror, starting auth flow..."
              );

              this.performAuthFlow()
                .then(async () => {
                  this.log("info", "Auth completed, reconnecting...");
                  // Don't recreate here - let the MCP client handle reconnection
                  // The next connection attempt will have the auth token
                })
                .catch((authError) => {
                  this.log("error", "Auth flow failed:", authError);
                  // Pass the original error to the client
                  originalErrorCallback(error);
                });

              // Don't pass the auth error to the client immediately
              return;
            }

            // Pass through non-auth errors
            originalErrorCallback(error);
          };
          return true;
        }

        (target as any)[prop] = value;
        return true;
      },
    });

    // Override the start method to handle auth errors during connection
    const originalStart = baseTransport.start.bind(baseTransport);
    proxy.start = async () => {
      try {
        this.log("debug", "Starting transport...");
        await originalStart();
        this.log("debug", "Transport started successfully");
      } catch (error) {
        this.log("error", "Transport start failed:", error);
        this.log(
          "debug",
          `Error type: ${typeof error}, isAuthError: ${this.isAuthError(error)}, isAuthenticating: ${this._isAuthenticating}`
        );

        if (this.isAuthError(error) && !this._isAuthenticating) {
          this.log(
            "info",
            "Auth required for connection, starting auth flow..."
          );

          await this.performAuthFlow();

          // Recreate the base transport with the new auth token
          await this.recreateTransportAfterAuth();

          // Start the newly created transport (which will be the updated this.transport)
          if (this.transport && this.transport !== proxy) {
            this.log(
              "debug",
              "Starting newly created authenticated transport..."
            );
            await this.transport.start();
          }
        } else {
          this.log(
            "error",
            "Non-auth error or already authenticating, rethrowing"
          );
          throw error;
        }
      }
    };

    return proxy;
  }

  private async recreateTransportAfterAuth(): Promise<void> {
    // Close the existing transport if it exists
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (e) {
        // Ignore close errors
      }
      this.transport = null;
    }

    // Create a new transport with the updated auth token
    await this.createTransport();
  }

  private isAuthError(error: any): boolean {
    this.log("debug", `Checking if error is auth error:`, error);

    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message;
      this.log("debug", `Error message: "${message}"`);

      if (
        message.includes("Unauthorized") ||
        message.includes("Bearer token required") ||
        message.includes("401") ||
        message.includes("403") ||
        message.includes("missing required Authorization header")
      ) {
        this.log("debug", "Detected as auth error via Error message");
        return true;
      }
    }

    // Check for JSON-RPC auth errors
    if (error?.code === -32603 && error?.message?.includes("Unauthorized")) {
      this.log("debug", "Detected as JSON-RPC auth error (Unauthorized)");
      return true;
    }
    if (
      error?.code === -32603 &&
      error?.message?.includes("Bearer token required")
    ) {
      this.log(
        "debug",
        "Detected as JSON-RPC auth error (Bearer token required)"
      );
      return true;
    }

    // Check for HTTP status codes
    if (error?.status === 401 || error?.status === 403) {
      this.log(
        "debug",
        `Detected as auth error via HTTP status: ${error.status}`
      );
      return true;
    }

    this.log("debug", "Not detected as auth error");
    return false;
  }

  private async performAuthFlow(): Promise<void> {
    this.log(
      "debug",
      `performAuthFlow called - isAuthenticating: ${this._isAuthenticating}, authProvider: ${!!this.authProvider}`
    );

    if (this._isAuthenticating) {
      this.log(
        "debug",
        "performAuthFlow early return - already authenticating"
      );
      return;
    }

    // Create auth provider if it doesn't exist
    if (!this.authProvider) {
      this.log("debug", "Creating auth provider for OAuth flow");
      this.authProvider = new BrowserOAuthClientProvider(this.config.url, {
        clientName: this.config.authClientName || "MCP Client",
        clientUri: this.config.authClientUri || window.location.origin,
        callbackUrl:
          this.config.authCallbackUrl ||
          new URL("/oauth/callback", window.location.origin).toString(),
        onLog: (level, message) => this.log(level, `[OAuth] ${message}`),
      });
    }

    this._isAuthenticating = true;
    try {
      // Check if we already have tokens
      const existingTokens = await this.authProvider.tokens();
      this.log(
        "debug",
        `Existing tokens: ${existingTokens ? "present" : "none"}`
      );

      this.log("info", "Starting OAuth flow...");
      const result = await auth(this.authProvider, {
        serverUrl: this.config.url,
        fetchFn: this.createProxyFetch(),
      });

      this.log("debug", `OAuth flow result: ${result}`);

      if (result === "AUTHORIZED") {
        this.log(
          "info",
          "Authentication successful - user already had valid tokens"
        );
        // Auth completed immediately, recreate transport
        await this.createTransport();
        this._isAuthenticating = false;
      } else if (result === "REDIRECT") {
        this.log(
          "info",
          "OAuth popup should have opened - waiting for user to complete authentication"
        );

        this.waitForAuthCompletion();
      } else {
        this.log("error", `Unexpected auth result: ${result}`);
        this._isAuthenticating = false;
      }
    } catch (error) {
      this.log("error", "Auth flow error:", error);
      this.log(
        "error",
        "Auth flow error details:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      if (error instanceof Error) {
        this.log("error", "Auth flow error message:", error.message);
        this.log("error", "Auth flow error stack:", error.stack);
      }
      this._isAuthenticating = false;
    }
  }

  private waitForAuthCompletion(): void {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "mcp_auth_callback") {
        window.removeEventListener("message", handleAuthMessage);
        if (event.data.success) {
          if (this.transport) {
            this.transport.close().catch(() => {
              // Ignore errors during cleanup
            });
            this.transport = null;
            this.connected = false;
          }

          window.setTimeout(() => {
            this.createTransport()
              .then(() => {
                this.connected = true;
              })
              .catch((error) => {
                this.log(
                  "error",
                  "Failed to recreate transport after auth:",
                  error
                );
              })
              .finally(() => {
                this._isAuthenticating = false;
              });
          }, 100);
        } else {
          this.log("error", "Auth failed:", event.data.error);
          this._isAuthenticating = false;
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);
    window.setTimeout(() => {
      window.removeEventListener("message", handleAuthMessage);
      this._isAuthenticating = false;
    }, AUTH_TIMEOUT);
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

  public isAuthenticating(): boolean {
    return this._isAuthenticating;
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    ...args: unknown[]
  ): void {
    const fullMessage =
      args.length > 0
        ? `${message} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
        : message;

    //console[level](`[Mcp HttpTransport] ${fullMessage}`);
  }
}

export default HttpTransport;
