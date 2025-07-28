import TakePictureServer from "@ai/mcp/mcpServers/takePictureServer";
import { McpServerStoreBuiltIn } from "@ai/types";

export const defaultBuiltinServers: McpServerStoreBuiltIn[] = [
  {
    name: "Take Picture",
    serverType: "take_picture",
    active: false,
    active_tools: [],
  },
];

export const createBuiltinServer = (serverType: string) => {
  switch (serverType) {
    case "take_picture":
      return new TakePictureServer().getTransport();
    default:
      throw new Error(`Unknown built-in server type: ${serverType}`);
  }
};
