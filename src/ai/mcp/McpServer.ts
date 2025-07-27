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

export interface McpTransport {
  connect(): Promise<Transport>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export enum McpState {
  IDLE = "idle",
  DISCOVERING = "discovering",
  CONNECTING = "connecting",
  AUTHENTICATING = "authenticating",
  PENDING_AUTH = "pending_auth",
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

// Main MCP class
export class McpServer {
  private config: McpConfig;
  private callbacks: McpCallbacks;
  private transport: McpTransport | null = null;
  private client: Client | null = null;
  private transportInstance: Transport | null = null;

  private _state: McpState = McpState.IDLE;
  private _tools: Tool[] = [];
  private _resources: Resource[] = [];
  private _resourceTemplates: ResourceTemplate[] = [];
  private _prompts: Prompt[] = [];
  private _error: string | undefined;
  private _authUrl: string | undefined;

  private connecting = false;
  private connectAttempt = 0;

  private readonly DEFAULT_RECONNECT_DELAY = 3000;

  constructor(config: McpConfig = {}, callbacks: McpCallbacks = {}) {
    this.config = {
      clientConfig: {},
      debug: false,
      autoRetry: false,
      autoReconnect: this.DEFAULT_RECONNECT_DELAY,
      ...config,
    };
    this.callbacks = callbacks;

    this.initializeClient();
  }

  // Getters
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
  get authUrl() {
    return this._authUrl;
  }

  // Set transport and connect
  public async setTransport(transport: McpTransport): Promise<void> {
    if (this.transport) {
      await this.disconnect();
    }
    this.transport = transport;
  }

  public async connect(): Promise<void> {
    if (this.connecting) {
      this.log("debug", "Connection attempt already in progress.");
      return;
    }

    if (!this.transport) {
      throw new Error("No transport configured. Call setTransport() first.");
    }

    this.connecting = true;
    this.connectAttempt += 1;
    this.setState(McpState.DISCOVERING);
    this.setError(undefined);
    this.setAuthUrl(undefined);

    this.log("info", `Connecting attempt #${this.connectAttempt}...`);

    try {
      this.setState(McpState.CONNECTING);

      // Get transport instance
      this.transportInstance = await this.transport.connect();

      // Setup transport handlers
      this.setupTransportHandlers(this.transportInstance);

      // Connect client
      this.log("info", "Connecting client...");
      await this.client!.connect(this.transportInstance);

      // Load data
      this.setState(McpState.LOADING);
      await this.loadData();

      this.setState(McpState.READY);
      this.connectAttempt = 0;
      this.log("info", "Connection successful");
    } catch (error) {
      await this.handleConnectionError(error);
    } finally {
      this.connecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    this.log("info", "Disconnecting...");
    this.connecting = false;

    if (this.transport) {
      await this.transport.disconnect();
    }

    this.transportInstance = null;
    this.setState(McpState.IDLE);
    this.setTools([]);
    this.setResources([], []);
    this.setPrompts([]);
    this.setError(undefined);
    this.setAuthUrl(undefined);
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
      this.log(
        "error",
        `Error calling tool "${name}": ${error instanceof Error ? error.message : String(error)}`
      );

      // Auth errors should be handled by the transport

      throw error;
    }
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

  public async retry(): Promise<void> {
    if (this.state === McpState.FAILED) {
      this.log("info", "Retry requested...");
      await this.connect();
    } else {
      this.log(
        "warn",
        `Retry called but state is not 'failed' (state: ${this.state}). Ignoring.`
      );
    }
  }

  public async authenticate(): Promise<void> {
    this.log(
      "info",
      "Authentication should be handled by the transport implementation."
    );
    throw new Error(
      "Authentication should be handled by the transport. Use transport-specific auth methods."
    );
  }

  // Private methods
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
      if (
        !this.connecting &&
        this.state === McpState.READY &&
        this.config.autoReconnect
      ) {
        const delay =
          typeof this.config.autoReconnect === "number"
            ? this.config.autoReconnect
            : this.DEFAULT_RECONNECT_DELAY;

        this.log(
          "info",
          `Connection closed, attempting to reconnect in ${delay}ms...`
        );
        this.setState(McpState.CONNECTING);

        setTimeout(() => {
          this.connect();
        }, delay);
      } else if (
        this.state !== McpState.FAILED &&
        this.state !== McpState.AUTHENTICATING
      ) {
        this.failConnection("Connection closed unexpectedly.");
      }
    };
  }

  private async loadData(): Promise<void> {
    // Load tools
    const toolsResponse = await this.client!.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );
    this.setTools(toolsResponse.tools);

    // Load resources (optional)
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

    // Load prompts (optional)
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

  // State setters with callbacks
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

  private setAuthUrl(authUrl: string | undefined): void {
    this._authUrl = authUrl;
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
