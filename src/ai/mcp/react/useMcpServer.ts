import { useContext } from "preact/hooks";

import McpServerContext from "./McpServerContext";

const useMcpServer = () => {
  return useContext(McpServerContext);
};

export default useMcpServer;
