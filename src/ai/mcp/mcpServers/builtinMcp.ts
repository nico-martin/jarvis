import MemoriesServer from "@ai/mcp/mcpServers/MemoriesServer";
import { McpServerStoreBuiltIn } from "@ai/types";

import PromiseTransport from "../PromiseTransport";
import TakePictureServer from "./TakePictureServer";

export const defaultBuiltinServers: McpServerStoreBuiltIn[] = [
  {
    name: "Take Picture",
    serverType: "take_picture",
    active: false,
    activeTools: [],
    activePrompts: [],
  },
  {
    name: "Memories",
    serverType: "memories",
    active: false,
    activeTools: [],
    activePrompts: [],
  },
];

export const getBuiltInServerTransport = (
  serverType: string
): PromiseTransport => {
  switch (serverType) {
    case "take_picture":
      return new TakePictureServer().getTransport();
    case "memories":
      return new MemoriesServer().getTransport();
    default:
      throw new Error(`Unknown built-in server type: ${serverType}`);
  }
};
