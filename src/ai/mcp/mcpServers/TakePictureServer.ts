import { eventEmitter } from "../../../utils/eventEmitter";
import type {
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";

import PromiseTransport, {
  type PromiseTransportConfig,
} from "../PromiseTransport";

export interface TakePictureResult {
  success: boolean;
  imageData?: string;
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
                description: "Take a picture using the device camera",
                inputSchema: {
                  type: "object",
                  properties: {},
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
          arguments?: any;
        };

        if (params.name === "take_picture") {
          const result = await this.takePicture();

          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: "text",
                  text: result.success
                    ? "Picture taken successfully"
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

  private takePicture(): Promise<TakePictureResult> {
    return new Promise((resolve) => {
      const onPictureTaken = (imageData: string) => {
        resolve({ success: true, imageData });
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

      eventEmitter.emit("openTakePictureModal");
    });
  }

  public getTransport(): PromiseTransport {
    return this.transport;
  }
}

export default TakePictureServer;
