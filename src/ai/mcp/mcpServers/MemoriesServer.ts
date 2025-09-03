import type {
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";

import PromiseTransport, {
  type PromiseTransportConfig,
} from "../PromiseTransport";

export interface AddMemoryResult {
  success: boolean;
  memory?: string;
  error?: string;
}

export class MemoriesServer {
  private transport: PromiseTransport;

  constructor() {
    const config: PromiseTransportConfig = {
      executeRequest: async (
        request: JSONRPCRequest
      ): Promise<JSONRPCResponse | JSONRPCError> => {
        return this.handleRequest(request);
      },
      timeout: 30000,
      onConnect: async () => {
        //console.log("[MemoriesServer] Connected");
      },
    };

    this.transport = new PromiseTransport(config);
  }

  private async handleRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse | JSONRPCError> {
    try {
      if (request.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              prompts: {},
            },
            serverInfo: {
              name: "memories-server",
              version: "1.0.0",
            },
          },
        };
      }

      if (request.method === "tools/list") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
              {
                name: "add_memory",
                description:
                  "Store important information about the user or conversation context in memory. Use this when the user shares personal information, preferences, or context that should be remembered for future interactions. Dont forget to add context to the memory. If the user tells you that they are 20 years old, store 'The users ager is 20 years' and not only '20' since it will be hard to make sense of the value later without this context",
                inputSchema: {
                  type: "object",
                  properties: {
                    memory: {
                      type: "string",
                      description:
                        "The memory to store, describing what should be remembered about the user or context and also the context of what this memory is about.",
                    },
                  },
                  required: ["memory"],
                  additionalProperties: false,
                },
              },
            ],
          },
        };
      }

      if (request.method === "prompts/list") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            prompts: [
              {
                name: "user_memories",
                description: "Retrieve all stored memories about the user",
              },
            ],
          },
        };
      }

      if (request.method === "prompts/get") {
        const params = request.params as {
          name: string;
        };

        if (params.name === "user_memories") {
          const memories = this.getStoredMemories();
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              description: "User memories and context",
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text:
                      memories.length > 0
                        ? `Here are the stored memories about the user:\n${memories.map((m) => `- ${m}`).join("\n")}`
                        : "No memories have been stored yet.",
                  },
                },
              ],
            },
          };
        }
      }

      if (request.method === "tools/call") {
        const params = request.params as {
          name: string;
          arguments?: {
            memory?: string;
          };
        };

        if (params.name === "add_memory") {
          const memory = params.arguments?.memory;
          if (!memory) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: "Error: Memory content is required",
                  },
                ],
              },
            };
          }

          const result = this.addMemory(memory);
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: "text",
                  text: result.success
                    ? `Memory stored successfully: ${result.memory}`
                    : `Failed to store memory: ${result.error}`,
                },
              ],
            },
          };
        }
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: "Method not found",
        },
      } as JSONRPCError;
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      } as JSONRPCError;
    }
  }

  private addMemory(memory: string): AddMemoryResult {
    try {
      const existingMemories = this.getStoredMemories();
      const updatedMemories = [...existingMemories, memory];

      localStorage.setItem(
        "jarvis_user_memories",
        JSON.stringify(updatedMemories)
      );

      return {
        success: true,
        memory,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to store memory",
      };
    }
  }

  private getStoredMemories(): string[] {
    try {
      const stored = localStorage.getItem("jarvis_user_memories");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public getTransport(): PromiseTransport {
    return this.transport;
  }
}

export default MemoriesServer;
