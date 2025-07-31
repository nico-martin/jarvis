import type {
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";

import { eventEmitter } from "../../../utils/eventEmitter";
import ImageToText from "../../imageToText/ImageToText";
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
  private imageToText: ImageToText;

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
    this.imageToText = new ImageToText();

    // Preload the ImageToText model
    this.imageToText.preload().catch((error) => {
      console.warn(
        "[TakePictureServer] Failed to preload ImageToText model:",
        error
      );
    });
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
                  "Take a picture using the device camera and analyze it based on a specific query or question",
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
      const onPictureTaken = async (imageData: string) => {
        try {
          // Create data URL from base64 image data
          const dataUrl = `data:image/png;base64,${imageData}`;

          // Create prompt based on query or use default
          const prompt = query
            ? `${query}. Please provide a short answer based on what you see in this image.`
            : "Describe what you see in this image. Include objects, people, actions, setting, and any text visible in the image. But keep it rather short";

          // Process image with ImageToText using the custom prompt
          const description = await this.imageToText.generate(dataUrl, prompt);

          resolve({
            success: true,
            imageData,
            description,
          });
          unsubscribeError();
        } catch (error) {
          console.error(
            "[TakePictureServer] Failed to process image with ImageToText:",
            error
          );
          // Still return success with image data, but without description
          resolve({
            success: true,
            imageData,
            description:
              "Image captured successfully, but description could not be generated.",
          });
          unsubscribeError();
        }
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
