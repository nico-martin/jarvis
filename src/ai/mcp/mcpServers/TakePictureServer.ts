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
                  'This tool captures a photo using the device camera and provides an AI-generated description of the image content. Use this tool whenever the user asks about anything visual in their current environment (for example identifying objects, reading visible text, describing scenes, checking colors, or answering "what do you see" style questions). If asked about visual details like clothing color (for example "what color is my shirt"), call this tool first and then answer from the result. Do not ask the user to provide or upload a picture when this tool is available; this tool already captures one.',
                inputSchema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description:
                        "The exact user question or instruction describing what to inspect in the photo (for example: 'What color is my shirt?').",
                    },
                  },
                  required: ["query"],
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
