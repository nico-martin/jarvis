import { McpTransport } from "@ai/mcp/types";
import {
  OAuthClientProvider,
  UnauthorizedError,
  auth,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { sanitizeUrl } from "strict-url-sanitise";

export interface HttpTransportConfig {
  url: string;
  customHeaders?: Record<string, string>;
  requestInit?: RequestInit;
  authConfig?: {
    clientName?: string;
    clientUri?: string;
    callbackUrl?: string;
    storageKeyPrefix?: string;
    preventAutoAuth?: boolean;
    onPopupWindow?: (url: string) => void;
  };
  onAuthStateChange?: (
    state: "idle" | "authenticating" | "pending_auth" | "authorized" | "failed"
  ) => void;
  onAuthUrlChange?: (authUrl: string | undefined) => void;
  onError?: (error: string) => void;
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void;
}

export class HttpTransport implements McpTransport {
  private config: HttpTransportConfig;
  private transport: Transport | null = null;
  private connected = false;
  private authProvider: OAuthClientProvider | null = null;
  private authState:
    | "idle"
    | "authenticating"
    | "pending_auth"
    | "authorized"
    | "failed" = "idle";
  private authTimeout: NodeJS.Timeout | null = null;
  private authProviderInitialized = false;
  private readonly AUTH_TIMEOUT = 5 * 60 * 1000;

  constructor(config: HttpTransportConfig) {
    this.config = {
      customHeaders: {},
      authConfig: {
        clientName: "MCP Client",
        callbackUrl:
          typeof window !== "undefined"
            ? sanitizeUrl(
                new URL("/oauth/callback", window.location.origin).toString()
              )
            : "/oauth/callback",
        storageKeyPrefix: "mcp:auth",
        preventAutoAuth: false,
        ...config.authConfig,
      },
      ...config,
    };

    // Initialize auth provider synchronously first, then improve it asynchronously
    this.createBasicAuthProvider();
    this.initializeAuthProvider();
  }

  private async initializeAuthProvider(): Promise<void> {
    if (this.authProviderInitialized) {
      return;
    }

    if (typeof window !== "undefined") {
      try {
        // Use the local BrowserOAuthClientProvider implementation
        const { BrowserOAuthClientProvider } = await import(
          "./auth/browser-provider.js"
        );

        this.authProvider = new BrowserOAuthClientProvider(this.config.url, {
          clientName: this.config.authConfig?.clientName,
          clientUri: this.config.authConfig?.clientUri,
          callbackUrl: this.config.authConfig?.callbackUrl,
          storageKeyPrefix: this.config.authConfig?.storageKeyPrefix,
          preventAutoAuth: this.config.authConfig?.preventAutoAuth,
          onPopupWindow: this.config.authConfig?.onPopupWindow,
        });

        this.log("info", "Browser OAuth provider initialized");
      } catch (error) {
        this.log(
          "warn",
          "Failed to initialize OAuth provider, using basic auth"
        );
        this.createBasicAuthProvider();
      }
    } else {
      this.createBasicAuthProvider();
    }

    this.authProviderInitialized = true;
  }

  private createBasicAuthProvider(): void {
    // Create a minimal auth provider that always returns no tokens
    this.authProvider = {
      tokens: async () => null,
      clearTokens: async () => {},
      redirectUrl: this.config.authConfig?.callbackUrl || "/oauth/callback",
      clientMetadata: {
        redirect_uris: [
          this.config.authConfig?.callbackUrl || "/oauth/callback",
        ],
        client_name: this.config.authConfig?.clientName || "MCP Client",
      },
      clientInformation: () => ({
        client_id: "basic-auth-client",
        client_name: this.config.authConfig?.clientName || "MCP Client",
      }),
      saveTokens: async () => {},
      handleCallback: async () => null,
      redirectToAuthorization: async () => {},
      saveCodeVerifier: async () => {},
      codeVerifier: async () => null,
    } as OAuthClientProvider;
  }

  async connect(): Promise<Transport> {
    if (this.connected && this.transport) {
      return this.transport;
    }

    // Wait for auth provider initialization to complete
    await this.initializeAuthProvider();

    try {
      await this.createTransport();
      this.connected = true;
      this.setAuthState("authorized");
      return this.transport!;
    } catch (error) {
      if (this.isAuthError(error)) {
        await this.handleAuthError(error);
        // After auth, retry creating transport
        await this.createTransport();
        this.connected = true;
        this.setAuthState("authorized");
        return this.transport!;
      }
      throw error;
    }
  }

  private async createTransport(): Promise<void> {
    const options: any = {
      requestInit: {
        headers: {
          Accept: "application/json",
          ...this.config.customHeaders,
        },
        ...this.config.requestInit,
      },
    };

    // Only add authProvider if it exists and is properly initialized
    if (this.authProvider) {
      options.authProvider = this.authProvider;
      this.log("info", "Adding auth provider to transport options");
    } else {
      this.log("warn", "No auth provider available");
    }

    console.log("Transport options:", options);

    const sanitizedUrl = sanitizeUrl(this.config.url);
    const targetUrl = new URL(sanitizedUrl);

    this.log("info", `Creating HTTP transport for ${sanitizedUrl}`);
    this.transport = new StreamableHTTPClientTransport(targetUrl, options);
  }

  private isAuthError(error: unknown): boolean {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    return (
      errorInstance instanceof UnauthorizedError ||
      errorInstance.message.includes("Unauthorized") ||
      errorInstance.message.includes("401") ||
      errorInstance.message.includes("HTTP 401") ||
      errorInstance.message.includes("Authorization header") ||
      errorInstance.message.includes("missing required Authorization")
    );
  }

  private async handleAuthError(error: unknown): Promise<void> {
    this.log("info", "Authentication required");
    this.setAuthState("authenticating");

    // Check if we have existing tokens
    const existingTokens = this.authProvider
      ? await this.authProvider.tokens()
      : null;

    // If preventAutoAuth is enabled and no valid tokens exist, go to pending_auth state
    if (this.config.authConfig?.preventAutoAuth && !existingTokens) {
      this.log(
        "info",
        "Authentication required but auto-auth prevented. User action needed."
      );
      this.setAuthState("pending_auth");
      throw new Error("Authentication required - call authenticate() manually");
    }

    if (this.authTimeout) clearTimeout(this.authTimeout);
    this.authTimeout = setTimeout(() => {
      this.handleAuthFailure("Authentication timeout");
    }, this.AUTH_TIMEOUT) as NodeJS.Timeout;

    try {
      if (!this.authProvider) {
        throw new Error("Auth provider not available");
      }

      const authResult = await auth(this.authProvider, {
        serverUrl: this.config.url,
      });

      if (this.authTimeout) clearTimeout(this.authTimeout);

      if (authResult === "AUTHORIZED") {
        this.log("info", "Authentication successful");
        this.setAuthState("authorized");
      } else if (authResult === "REDIRECT") {
        this.log("info", "Authentication redirect initiated");
        // State remains authenticating, wait for callback
        throw new Error(
          "Authentication redirect - waiting for user to complete auth flow"
        );
      }
    } catch (authError) {
      if (this.authTimeout) clearTimeout(this.authTimeout);
      this.handleAuthFailure(
        `Authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`
      );
      throw authError;
    }
  }

  private handleAuthFailure(message: string): void {
    this.log("error", message);
    this.setAuthState("failed");
    this.config.onError?.(message);
  }

  async authenticate(): Promise<void> {
    this.log("info", "Manual authentication requested");

    if (this.authState === "pending_auth") {
      await this.handleAuthError(new Error("Manual authentication"));
    } else if (this.authState === "failed") {
      // Reset state and retry
      this.setAuthState("idle");
      await this.connect();
    } else {
      this.log(
        "warn",
        `Cannot authenticate in current state: ${this.authState}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = null;
    }

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }

    this.connected = false;
    this.setAuthState("idle");
  }

  isConnected(): boolean {
    return this.connected && this.authState === "authorized";
  }

  get currentAuthState() {
    return this.authState;
  }

  /**
   * Get the last attempted authorization URL from the auth provider.
   * Useful for manual authentication when popup is blocked.
   */
  getLastAuthUrl(): string | null {
    if (this.authProvider && "getLastAttemptedAuthUrl" in this.authProvider) {
      return (this.authProvider as any).getLastAttemptedAuthUrl();
    }
    return null;
  }

  private setAuthState(
    state: "idle" | "authenticating" | "pending_auth" | "authorized" | "failed"
  ): void {
    this.authState = state;
    this.config.onAuthStateChange?.(state);
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string
  ): void {
    this.config.onLog?.(level, `[HttpTransport] ${message}`);
  }
}

export default HttpTransport;
