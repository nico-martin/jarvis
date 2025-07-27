import TakePictureServer from "@ai/mcp/mcpServers/takePictureServer";
import { McpBuiltinServer } from "@ai/types";

export const defaultBuiltinServers: McpBuiltinServer[] = [
  {
    id: "take-picture",
    name: "Take Picture",
    description: "Take pictures using the device camera",
    type: "builtin",
    serverType: "take_picture",
    active: true,
    removable: false,
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
