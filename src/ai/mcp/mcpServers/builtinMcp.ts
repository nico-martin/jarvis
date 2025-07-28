import { McpServerStoreBuiltIn } from "@ai/types";

import TakePictureServer from "./takePictureServer";

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
