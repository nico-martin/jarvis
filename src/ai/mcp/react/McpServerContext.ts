import { createContext } from "preact";

import { McpServerContextType } from "./types";

const McpServerContextProvider =
  createContext<McpServerContextType>(null);

export default McpServerContextProvider;
