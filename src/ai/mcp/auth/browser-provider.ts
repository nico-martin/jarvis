import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { sanitizeUrl } from "strict-url-sanitise";

import { StoredState } from "./types";

/**
 * Browser-compatible OAuth client provider for MCP using localStorage.
 */
export class BrowserOAuthClientProvider implements OAuthClientProvider {
  readonly serverUrl: string;
  readonly storageKeyPrefix: string;
  readonly serverUrlHash: string;
  readonly clientName: string;
  readonly clientUri: string;
  readonly callbackUrl: string;
  private preventAutoAuth?: boolean;
  readonly onPopupWindow:
    | ((url: string, features: string, window: Window | null) => void)
    | undefined;
  readonly onLog:
    | ((level: "debug" | "info" | "warn" | "error", message: string) => void)
    | undefined;

  constructor(
    serverUrl: string,
    options: {
      storageKeyPrefix?: string;
      clientName?: string;
      clientUri?: string;
      callbackUrl?: string;
      preventAutoAuth?: boolean;
      onPopupWindow?: (
        url: string,
        features: string,
        window: Window | null
      ) => void;
      onLog?: (
        level: "debug" | "info" | "warn" | "error",
        message: string
      ) => void;
    } = {}
  ) {
    this.serverUrl = serverUrl;
    this.storageKeyPrefix = options.storageKeyPrefix || "mcp:auth";
    this.serverUrlHash = this.hashString(serverUrl);
    this.clientName = options.clientName || "MCP Browser Client";
    this.clientUri =
      options.clientUri ||
      (typeof window !== "undefined" ? window.location.origin : "");
    this.callbackUrl = sanitizeUrl(
      options.callbackUrl ||
        (typeof window !== "undefined"
          ? new URL("/oauth/callback", window.location.origin).toString()
          : "/oauth/callback")
    );
    this.preventAutoAuth = options.preventAutoAuth;
    this.onPopupWindow = options.onPopupWindow;
    this.onLog = options.onLog;
  }

  // --- SDK Interface Methods ---

  get redirectUrl(): string {
    return sanitizeUrl(this.callbackUrl);
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none", // Public client
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: this.clientName,
      client_uri: this.clientUri,
      // scope: 'openid profile email mcp', // Example scopes, adjust as needed
    };
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const key = this.getKey("client_info");
    const data = localStorage.getItem(key);
    if (!data) return undefined;
    try {
      // TODO: Add validation using a schema
      return JSON.parse(data) as OAuthClientInformation;
    } catch (e) {
      this.log("warn", `Failed to parse client information: ${e}`);
      localStorage.removeItem(key);
      return undefined;
    }
  }

  // NOTE: The SDK's auth() function uses this if dynamic registration is needed.
  // Ensure your OAuthClientInformationFull matches the expected structure if DCR is used.
  async saveClientInformation(
    clientInformation: OAuthClientInformation /* | OAuthClientInformationFull */
  ): Promise<void> {
    const key = this.getKey("client_info");
    // Cast needed if handling OAuthClientInformationFull specifically
    localStorage.setItem(key, JSON.stringify(clientInformation));
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const key = this.getKey("tokens");
    const data = localStorage.getItem(key);
    if (!data) return undefined;
    try {
      // TODO: Add validation
      return JSON.parse(data) as OAuthTokens;
    } catch (e) {
      this.log("warn", `Failed to parse tokens: ${e}`);
      localStorage.removeItem(key);
      return undefined;
    }
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const key = this.getKey("tokens");
    localStorage.setItem(key, JSON.stringify(tokens));
    // Clean up code verifier and last auth URL after successful token save
    localStorage.removeItem(this.getKey("code_verifier"));
    localStorage.removeItem(this.getKey("last_auth_url"));
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const key = this.getKey("code_verifier");
    localStorage.setItem(key, codeVerifier);
  }

  async codeVerifier(): Promise<string> {
    const key = this.getKey("code_verifier");
    const verifier = localStorage.getItem(key);
    if (!verifier) {
      throw new Error(
        `[${this.storageKeyPrefix}] Code verifier not found in storage for key ${key}. Auth flow likely corrupted or timed out.`
      );
    }
    // SDK's auth() retrieves this BEFORE exchanging code. Don't remove it here.
    // It will be removed in saveTokens on success.
    return verifier;
  }

  /**
   * Generates and stores the authorization URL with state, without opening a popup.
   * Used when preventAutoAuth is enabled to provide the URL for manual navigation.
   * @param authorizationUrl The fully constructed authorization URL from the SDK.
   * @returns The full authorization URL with state parameter.
   */
  async prepareAuthorizationUrl(authorizationUrl: URL): Promise<string> {
    // Generate a unique state parameter for this authorization request
    const state = crypto.randomUUID();
    const stateKey = `${this.storageKeyPrefix}:state_${state}`;

    // Store context needed by the callback handler, associated with the state param
    const stateData: StoredState = {
      serverUrlHash: this.serverUrlHash,
      expiry: Date.now() + 1000 * 60 * 10, // State expires in 10 minutes
      // Store provider options needed to reconstruct on callback
      providerOptions: {
        serverUrl: this.serverUrl,
        storageKeyPrefix: this.storageKeyPrefix,
        clientName: this.clientName,
        clientUri: this.clientUri,
        callbackUrl: this.callbackUrl,
      },
    };
    localStorage.setItem(stateKey, JSON.stringify(stateData));

    // Add the state parameter to the URL
    authorizationUrl.searchParams.set("state", state);
    const authUrlString = authorizationUrl.toString();

    // Sanitize the authorization URL to prevent XSS attacks
    const sanitizedAuthUrl = sanitizeUrl(authUrlString);

    // Persist the exact auth URL in case the popup fails and manual navigation is needed
    localStorage.setItem(this.getKey("last_auth_url"), sanitizedAuthUrl);

    return sanitizedAuthUrl;
  }

  /**
   * Redirects the user agent to the authorization URL, storing necessary state.
   * This now adheres to the SDK's void return type expectation for the interface.
   * @param authorizationUrl The fully constructed authorization URL from the SDK.
   */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // Ideally we should catch things before we get here, but if we don't, let's not show everyone we are dum
    if (this.preventAutoAuth) return;

    // Prepare the authorization URL with state
    const sanitizedAuthUrl =
      await this.prepareAuthorizationUrl(authorizationUrl);

    // Attempt to open the popup
    const popupFeatures =
      "width=600,height=700,resizable=yes,scrollbars=yes,status=yes"; // Make configurable if needed
    try {
      const popup = window.open(
        sanitizedAuthUrl,
        `mcp_auth_${this.serverUrlHash}`,
        popupFeatures
      );

      // If a callback is provided, invoke it after opening the popup
      if (this.onPopupWindow) {
        this.onPopupWindow(sanitizedAuthUrl, popupFeatures, popup);
      }

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        this.log(
          "warn",
          "Popup likely blocked by browser. Manual navigation might be required using the stored URL."
        );
        // Cannot signal failure back via SDK auth() directly.
        // useMcp will need to rely on timeout or manual trigger if stuck.
      } else {
        popup.focus();
        this.log("info", "Redirecting to authorization URL in popup.");
      }
    } catch (e) {
      this.log("error", `Error opening popup window: ${e}`);
      // Cannot signal failure back via SDK auth() directly.
    }
    // Regardless of popup success, the interface expects this method to initiate the redirect.
    // If the popup failed, the user journey stops here until manual action or timeout.
  }

  // --- Helper Methods ---

  /**
   * Retrieves the last URL passed to `redirectToAuthorization`. Useful for manual fallback.
   */
  getLastAttemptedAuthUrl(): string | null {
    const storedUrl = localStorage.getItem(this.getKey("last_auth_url"));
    return storedUrl ? sanitizeUrl(storedUrl) : null;
  }

  clearStorage(): number {
    const prefixPattern = `${this.storageKeyPrefix}_${this.serverUrlHash}_`;
    const statePattern = `${this.storageKeyPrefix}:state_`;
    const keysToRemove: string[] = [];
    let count = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(prefixPattern)) {
        keysToRemove.push(key);
      } else if (key.startsWith(statePattern)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            // Check if state belongs to this provider instance based on serverUrlHash
            // We need to parse cautiously as the structure isn't guaranteed.
            const state = JSON.parse(item) as Partial<StoredState>;
            if (state.serverUrlHash === this.serverUrlHash) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          this.log(
            "warn",
            `Error parsing state key ${key} during clearStorage: ${e}`
          );
          // Optionally remove malformed keys
          // keysToRemove.push(key);
        }
      }
    }

    const uniqueKeysToRemove = Array.from(new Set(keysToRemove));
    uniqueKeysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      count++;
    });
    return count;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getKey(keySuffix: string): string {
    return `${this.storageKeyPrefix}_${this.serverUrlHash}_${keySuffix}`;
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string
  ): void {
    this.onLog && this.onLog(level, message);
  }
}
