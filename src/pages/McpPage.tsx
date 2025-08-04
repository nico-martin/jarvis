import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { PageContent } from "@theme";
import McpOverview from "@ui/mcp/McpOverview";

import { version } from "../../package.json";

export function McpPage() {
  return (
    <PageContent
      title="MCP_SERVERS_CONTROL"
      subtitle="MODEL_CONTEXT_PROTOCOL_MANAGEMENT_INTERFACE"
      statusBar={{
        [`VERSION_${version}`]: false,
        "MONITORING: ENABLED": true,
      }}
      button={{
        to: "/",
        iconLeft: <ChatBubbleLeftRightIcon width="1.25em" />,
        children: "RETURN_TO_CHAT",
      }}
    >
      <McpOverview />
    </PageContent>
  );
}

export default McpPage;
