import type {
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import { eventEmitter } from "@utils/eventEmitter";

import PromiseTransport, {
  type PromiseTransportConfig,
} from "../PromiseTransport";

export interface TakePictureResult {
  success: boolean;
  imageData?: string;
  description?: string;
  error?: string;
}

export class TakePictureServer {
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
        //console.log("[TakePictureServer] Connected");
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
            },
            serverInfo: {
              name: "take-picture-server",
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
                name: "take_picture",
                description:
                  'This tool captures a photo using the device camera and provides an AI-generated description of the image content. Use this tool when the user requests to take a photo, asks you to analyze or describe something in their current environment, wants to identify objects/text/scenes they can see, or asks questions like "What do you see?" or "Can you look at this?".',
                inputSchema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description:
                        "Optional question or description of what to look for in the picture. If not provided, a general description will be generated.",
                    },
                  },
                  additionalProperties: false,
                },
              },
            ],
          },
        };
      }

      if (request.method === "tools/call") {
        const params = request.params as {
          name: string;
          arguments?: {
            query?: string;
          };
        };

        if (params.name === "take_picture") {
          const query = params.arguments?.query;
          const result = await this.takePicture(query);

          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: "text",
                  text: result.success
                    ? result.description
                      ? `Picture taken successfully. Description: ${result.description}`
                      : "Picture taken successfully"
                    : `Failed to take picture: ${result.error}`,
                },
                ...(result.imageData
                  ? [
                      {
                        type: "image",
                        data: result.imageData,
                        mimeType: "image/png",
                      },
                    ]
                  : []),
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

  private takePicture(query?: string): Promise<TakePictureResult> {
    return new Promise((resolve) => {
      const onPictureTaken = async ({
        imageData,
        imageDescription,
      }: {
        imageData: string;
        imageDescription: string;
      }) => {
        resolve({
          success: true,
          imageData,
          description: imageDescription,
        });
        unsubscribeError();
      };

      const onPictureError = (error: string) => {
        resolve({ success: false, error });
        unsubscribePicture();
      };

      const unsubscribePicture = eventEmitter.on(
        "pictureTaken",
        onPictureTaken
      );

      const unsubscribeError = eventEmitter.on(
        "takePictureError",
        onPictureError
      );

      eventEmitter.emit("openTakePictureModal", query);
    });
  }

  public getTransport(): PromiseTransport {
    return this.transport;
  }
}

export default TakePictureServer;
