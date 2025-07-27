import type {
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";

import { PromiseTransport, PromiseTransportConfig } from "../PromiseTransport";

export interface TakePictureOptions {
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  width?: number;
  height?: number;
}

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
                  properties: {
                    format: {
                      type: "string",
                      enum: ["png", "jpeg", "webp"],
                      description: "Image format",
                      default: "png",
                    },
                    quality: {
                      type: "number",
                      minimum: 0.1,
                      maximum: 1.0,
                      description:
                        "Image quality (0.1-1.0, applies to jpeg/webp)",
                      default: 0.9,
                    },
                    width: {
                      type: "number",
                      description: "Desired width in pixels",
                    },
                    height: {
                      type: "number",
                      description: "Desired height in pixels",
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
          arguments?: TakePictureOptions;
        };

        if (params.name === "take_picture") {
          const result = await this.takePicture(params.arguments || {});

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
                        mimeType: `image/${params.arguments?.format || "png"}`,
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

  private async takePicture(
    options: TakePictureOptions
  ): Promise<TakePictureResult> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          success: false,
          error: "Camera access not supported in this environment",
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: options.width,
          height: options.height,
        },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      await new Promise((resolve) => {
        video.addEventListener("loadedmetadata", resolve);
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        stream.getTracks().forEach((track) => track.stop());
        return {
          success: false,
          error: "Failed to get canvas context",
        };
      }

      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      const format = options.format || "png";
      const quality = options.quality || 0.9;

      const imageData = canvas.toDataURL(
        `image/${format}`,
        format !== "png" ? quality : undefined
      );

      return {
        success: true,
        imageData: imageData.split(",")[1],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  public getTransport(): PromiseTransport {
    return this.transport;
  }
}

export default TakePictureServer;
