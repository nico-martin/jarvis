import { McpTransport } from "@ai/mcp/types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolResultSchema,
  GetPromptResultSchema,
  JSONRPCMessage,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  Prompt,
  ReadResourceResultSchema,
  Resource,
  ResourceTemplate,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

export enum McpState {
  IDLE = "idle",
  CONNECTING = "connecting",
  LOADING = "loading",
  READY = "ready",
  FAILED = "failed",
}

export interface McpConfig {
  clientConfig?: {
    name?: string;
    version?: string;
  };
  debug?: boolean;
  autoRetry?: boolean | number;
  autoReconnect?: boolean | number;
}

export interface McpCallbacks {
  onStateChange?: (state: McpState) => void;
  onToolsChange?: (tools: Tool[]) => void;
  onResourcesChange?: (
    resources: Resource[],
    templates: ResourceTemplate[]
  ) => void;
  onPromptsChange?: (prompts: Prompt[]) => void;
  onError?: (error: string) => void;
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void;
}

export class McpServer {
  public config: McpConfig;
  private callbacks: McpCallbacks;
  private client: Client | null = null;
  private mcpTransport: McpTransport | null = null;

  private _state: McpState = McpState.IDLE;
  private _tools: Tool[] = [];
  private _resources: Resource[] = [];
  private _resourceTemplates: ResourceTemplate[] = [];
  private _prompts: Prompt[] = [];
  private _error: string | undefined;

  private connecting = false;
  private connectAttempt = 0;

  private readonly DEFAULT_RECONNECT_DELAY = 3000;

  constructor(config: McpConfig = {}, callbacks: McpCallbacks = {}) {
    this.config = {
      clientConfig: {
        name: "mcp-client",
        version: "0.1.0",
        ...config.clientConfig,
      },
      debug: false,
      autoRetry: false,
      autoReconnect: this.DEFAULT_RECONNECT_DELAY,
      ...config,
    };
    this.callbacks = callbacks;

    this.initializeClient();
  }

  get state() {
    return this._state;
  }
  get tools() {
    return this._tools;
  }
  get resources() {
    return this._resources;
  }
  get resourceTemplates() {
    return this._resourceTemplates;
  }
  get prompts() {
    return this._prompts;
  }
  get error() {
    return this._error;
  }

  public async setTransport(transport: McpTransport): Promise<void> {
    if (this.mcpTransport) {
      await this.disconnect();
    }

    this.mcpTransport = transport;
  }

  public async connect(): Promise<void> {
    if (this.connecting) {
      this.log("debug", "Connection attempt already in progress.");
      return;
    }

    if (!this.mcpTransport) {
      throw new Error(
        "No transport configured. Call setTransport() or setHttpUrl() first."
      );
    }

    this.connecting = true;
    this.connectAttempt += 1;
    this.setState(McpState.CONNECTING);
    this.setError(undefined);

    this.log("info", `Connecting attempt #${this.connectAttempt}...`);

    try {
      await this.tryConnect();
    } catch (error) {
      await this.handleConnectionError(error);
    } finally {
      this.connecting = false;
    }
  }

  private async tryConnect(): Promise<void> {
    const transport = await this.mcpTransport!.connect();

    this.setupTransportHandlers(transport);

    try {
      this.log("info", "Connecting client...");
      await this.client!.connect(transport);

      this.setState(McpState.LOADING);
      await this.loadData();

      this.setState(McpState.READY);
      this.connectAttempt = 0;
      this.log("info", "Connection successful");
    } catch (error) {
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.log("info", "Disconnecting...");
    this.connecting = false;

    if (this.mcpTransport) {
      try {
        await this.mcpTransport.disconnect();
      } catch (err) {
        this.log("warn", "Error disconnecting transport:", err);
      }
    }

    this.setState(McpState.IDLE);
    this.setTools([]);
    this.setResources([], []);
    this.setPrompts([]);
    this.setError(undefined);
  }

  public async callTool(name: string, args?: Record<string, unknown>) {
    if (this.state !== McpState.READY || !this.client) {
      throw new Error(
        `MCP client is not ready (current state: ${this.state}). Cannot call tool "${name}".`
      );
    }

    this.log("info", `Calling tool: ${name}`, args);

    try {
      const result = await this.client.request(
        { method: "tools/call", params: { name, arguments: args } },
        CallToolResultSchema
      );
      this.log("info", `Tool "${name}" call successful`);
      return result;
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));

      const isAuthenticating = this.mcpTransport?.isAuthenticating?.() ?? false;
      const isConnectionError =
        errorInstance.message.includes("Connection closed");
      // isConnectionClosed indicates that the transoprt closed the connection because of the auth flow
      const isConnectionClosed = this.isConnectionClosed(errorInstance);
      this.log("warn", `isConnectionClosed`, isConnectionClosed);
      this.log("warn", `isAuthenticating`, isAuthenticating);
      if (isConnectionClosed && isAuthenticating) {
        this.log(
          "debug",
          `Auth error detected for tool "${name}", waiting for authentication...`
        );

        try {
          await this.waitForAuthCompletion();
          this.log("debug", `Auth completed, retrying tool "${name}"`);

          // Retry the request after auth completion
          const result = await this.client.request(
            { method: "tools/call", params: { name, arguments: args } },
            CallToolResultSchema
          );
          this.log("info", `Tool "${name}" call successful after auth`);
          return result;
        } catch (retryError) {
          this.log(
            "error",
            `Error calling tool "${name}" after auth retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`
          );
          throw retryError;
        }
      }

      // For non-auth errors or when already authenticating, handle normally
      if (!isAuthenticating || !isConnectionError) {
        this.log(
          "error",
          `Error calling tool "${name}": ${errorInstance.message}`
        );
      }

      throw error;
    }
  }

  private isConnectionClosed(error: Error): boolean {
    return error.message.includes("Connection closed");
  }

  private async waitForAuthCompletion(timeout: number = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkAuth = () => {
        const isAuthenticating =
          this.mcpTransport?.isAuthenticating?.() ?? false;
        const isReady = this.state === McpState.READY;

        this.log(
          "debug",
          `Waiting for auth completion - isAuthenticating: ${isAuthenticating}, state: ${this.state}`
        );

        if (!isAuthenticating && isReady) {
          this.log("debug", "Auth and reconnection completed");
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error("Authentication timeout"));
          return;
        }

        setTimeout(checkAuth, 100);
      };

      checkAuth();
    });
  }

  public async listResources() {
    if (this.state !== McpState.READY || !this.client) {
      throw new Error(
        `MCP client is not ready (current state: ${this.state}). Cannot list resources.`
      );
    }

    this.log("info", "Listing resources...");

    try {
      const response = await this.client.request(
        { method: "resources/list" },
        ListResourcesResultSchema
      );

      this.setResources(
        response.resources,
        Array.isArray(response.resourceTemplates)
          ? response.resourceTemplates
          : []
      );

      this.log("info", `Listed ${response.resources.length} resources`);
    } catch (error) {
      this.log(
        "error",
        `Error listing resources: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  public async readResource(uri: string) {
    if (this.state !== McpState.READY || !this.client) {
      throw new Error(
        `MCP client is not ready (current state: ${this.state}). Cannot read resource "${uri}".`
      );
    }

    this.log("info", `Reading resource: ${uri}`);

    try {
      const result = await this.client.request(
        { method: "resources/read", params: { uri } },
        ReadResourceResultSchema
      );
      this.log("info", `Resource "${uri}" read successfully`);
      return result;
    } catch (error) {
      this.log(
        "error",
        `Error reading resource "${uri}": ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  public async listPrompts() {
    if (this.state !== McpState.READY || !this.client) {
      throw new Error(
        `MCP client is not ready (current state: ${this.state}). Cannot list prompts.`
      );
    }

    this.log("info", "Listing prompts...");

    try {
      const response = await this.client.request(
        { method: "prompts/list" },
        ListPromptsResultSchema
      );

      this.setPrompts(response.prompts);
      this.log("info", `Listed ${response.prompts.length} prompts`);
    } catch (error) {
      this.log(
        "error",
        `Error listing prompts: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  public async getPrompt(name: string, args?: Record<string, string>) {
    if (this.state !== McpState.READY || !this.client) {
      throw new Error(
        `MCP client is not ready (current state: ${this.state}). Cannot get prompt "${name}".`
      );
    }

    this.log("info", `Getting prompt: ${name}`, args);

    try {
      const result = await this.client.request(
        { method: "prompts/get", params: { name, arguments: args } },
        GetPromptResultSchema
      );
      this.log("info", `Prompt "${name}" retrieved successfully`);
      return result;
    } catch (error) {
      this.log(
        "error",
        `Error getting prompt "${name}": ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private initializeClient(): void {
    this.client = new Client(
      {
        name: this.config.clientConfig?.name || "mcp-client",
        version: this.config.clientConfig?.version || "0.1.0",
      },
      { capabilities: {} }
    );
  }

  private setupTransportHandlers(transport: Transport): void {
    transport.onmessage = (message: JSONRPCMessage) => {
      this.log("debug", `[Transport] Received: ${JSON.stringify(message)}`);
      // @ts-ignore
      this.client?.handleMessage?.(message);
    };

    transport.onerror = (err: Error) => {
      this.log("warn", `Transport error: ${err.message}`);
      this.failConnection(`Transport error: ${err.message}`, err);
    };

    transport.onclose = () => {
      const isAuthenticating = this.mcpTransport?.isAuthenticating?.() ?? false;

      if (
        !this.connecting &&
        this.state === McpState.READY &&
        this.config.autoReconnect
      ) {
        const delay =
          typeof this.config.autoReconnect === "number"
            ? this.config.autoReconnect
            : this.DEFAULT_RECONNECT_DELAY;

        // Only log reconnection message if not authenticating
        if (!isAuthenticating) {
          this.log(
            "info",
            `Connection closed, attempting to reconnect in ${delay}ms...`
          );
        }
        this.setState(McpState.CONNECTING);

        setTimeout(() => {
          this.connect();
        }, delay);
      } else if (this.state !== McpState.FAILED) {
        this.failConnection("Connection closed unexpectedly.");
      }
    };
  }

  private async loadData(): Promise<void> {
    const toolsResponse = await this.client!.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );
    this.setTools(toolsResponse.tools);

    try {
      const resourcesResponse = await this.client!.request(
        { method: "resources/list" },
        ListResourcesResultSchema
      );
      this.setResources(
        resourcesResponse.resources,
        Array.isArray(resourcesResponse.resourceTemplates)
          ? resourcesResponse.resourceTemplates
          : []
      );
    } catch (err) {
      this.log("debug", "Server does not support resources/list method");
    }

    try {
      const promptsResponse = await this.client!.request(
        { method: "prompts/list" },
        ListPromptsResultSchema
      );
      this.setPrompts(promptsResponse.prompts);
    } catch (err) {
      this.log("debug", "Server does not support prompts/list method");
    }

    const summary = [
      `Loaded ${toolsResponse.tools.length} tools`,
      `${this.resources.length} resources`,
      `${this.prompts.length} prompts`,
    ];
    this.log("info", summary.join(", "));
  }

  private async handleConnectionError(error: unknown): Promise<void> {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    this.failConnection(
      `Failed to connect: ${errorInstance.message}`,
      errorInstance
    );
  }

  private failConnection(errorMessage: string, connectionError?: Error): void {
    this.log("error", errorMessage, connectionError ?? "");
    this.setState(McpState.FAILED);
    this.setError(errorMessage);
    this.connecting = false;
  }

  private setState(state: McpState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  private setTools(tools: Tool[]): void {
    this._tools = tools;
    this.callbacks.onToolsChange?.(tools);
  }

  private setResources(
    resources: Resource[],
    templates: ResourceTemplate[]
  ): void {
    this._resources = resources;
    this._resourceTemplates = templates;
    this.callbacks.onResourcesChange?.(resources, templates);
  }

  private setPrompts(prompts: Prompt[]): void {
    this._prompts = prompts;
    this.callbacks.onPromptsChange?.(prompts);
  }

  private setError(error: string | undefined): void {
    this._error = error;
    if (error) {
      this.callbacks.onError?.(error);
    }
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

    console[level](`[Mcp] ${fullMessage}`);
    this.callbacks.onLog?.(level, fullMessage);
  }
}

export default McpServer;
