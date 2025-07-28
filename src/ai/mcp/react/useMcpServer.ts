import React from "react";

import McpServerContext from "./McpServerContext";

const useMcpServer = () => {
  return React.use(McpServerContext);
};

export default useMcpServer;
