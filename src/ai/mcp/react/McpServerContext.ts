import React from "react";

import { McpServerContextType } from "./types";

const McpServerContextProvider =
  React.createContext<McpServerContextType>(null);

export default McpServerContextProvider;
