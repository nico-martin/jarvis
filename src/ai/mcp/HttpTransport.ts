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
    };

    const sanitizedUrl = sanitizeUrl(this.config.url);
    const targetUrl = new URL(sanitizedUrl);

    const baseTransport = new StreamableHTTPClientTransport(targetUrl, options);
    this.transport = this.createAuthInterceptor(baseTransport);
  }

  private createAuthInterceptor(
    baseTransport: StreamableHTTPClientTransport
  ): Transport {
    return new Proxy(baseTransport, {
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

        (target as any)[prop] = value;
        return true;
      },
    });
  }

  private isAuthError(error: any): boolean {
    if (error?.code === -32603 && error?.message?.includes("Unauthorized")) {
      return true;
    }
    if (
      error?.code === -32603 &&
      error?.message?.includes("Bearer token required")
    ) {
      return true;
    }

    return error?.status === 401 || error?.status === 403;
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
      this.log("info", "Starting OAuth flow...");
      const result = await auth(this.authProvider, {
        serverUrl: this.config.url,
      });

      if (result === "AUTHORIZED") {
        this.log(
          "info",
          "Authentication successful - user completed OAuth flow"
        );
        // Auth completed immediately, recreate transport
        await this.createTransport();
        this._isAuthenticating = false;
      } else if (result === "REDIRECT") {
        this.log(
          "info",
          "OAuth popup opened - waiting for user to complete authentication"
        );

        this.waitForAuthCompletion();
      } else {
        this.log("error", `Unexpected auth result: ${result}`);
        this._isAuthenticating = false;
      }
    } catch (error) {
      this.log("error", "Auth flow error:", error);
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

    console[level](`[Mcp HttpTransport] ${fullMessage}`);
  }
}

export default HttpTransport;
