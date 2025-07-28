import { McpServerStoreBuiltIn } from "@ai/types";

import PromiseTransport from "../PromiseTransport";
import TakePictureServer from "./TakePictureServer";

export const defaultBuiltinServers: McpServerStoreBuiltIn[] = [
  {
    name: "Take Picture",
    serverType: "take_picture",
    active: false,
    activeTools: [],
  },
];

export const getBuiltInServerTransport = (
  serverType: string
): PromiseTransport => {
  switch (serverType) {
    case "take_picture":
      return new TakePictureServer().getTransport();
    default:
      throw new Error(`Unknown built-in server type: ${serverType}`);
  }
};
