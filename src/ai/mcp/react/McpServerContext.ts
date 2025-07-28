import { McpServerContextType } from "@ai/mcp/react/types";
import React from "react";

const McpServerContextProvider =
  React.createContext<McpServerContextType>(null);

export default McpServerContextProvider;
