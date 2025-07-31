import useMcpServer from "@ai/mcp/react/useMcpServer";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button, Message } from "@theme";
import cn from "@utils/classnames";
import React from "react";

const inputClasses =
  "w-full border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm px-3 py-2 text-sm text-blue-300 placeholder:text-blue-400/60 font-mono focus:border-blue-300 focus:ring-2 focus:ring-blue-400/50 focus:outline-none shadow-[inset_0_0_10px_rgba(0,162,255,0.1)]";
const labelClasses = "mb-1 block text-xs font-medium text-blue-300 font-mono uppercase tracking-wider";

interface AddHttpServerProps {
  className?: string;
}

function AddHttpServer({ className = "" }: AddHttpServerProps) {
  const { addHttpServer } = useMcpServer();

  const [newServer, setNewServer] = React.useState({ name: "", url: "" });
  const [addServerError, setAddServerError] = React.useState<string | null>(
    null
  );
  const [addServerLoading, setAddServerLoading] =
    React.useState<boolean>(false);

  const handleAddServer = async () => {
    if (!newServer.name.trim() || !newServer.url.trim()) {
      return;
    }
    setAddServerLoading(true);
    setAddServerError(null);

    try {
      await addHttpServer(newServer.name.trim(), newServer.url.trim());
      setNewServer({ name: "", url: "" });
    } catch (e) {
      setAddServerError(e.toString());
    } finally {
      setAddServerLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newServer.name.trim() && newServer.url.trim()) {
      e.preventDefault();
      handleAddServer();
    }
  };

  return (
    <div
      className={cn(
        "border border-blue-400/30 bg-blue-950/10 backdrop-blur-sm p-6 shadow-[0_0_20px_rgba(0,162,255,0.1)]",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
        INITIALIZE_HTTP_SERVER_CONNECTION
      </h3>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="server-name" className={labelClasses}>
            SERVER_DESIGNATION
          </label>
          <input
            id="server-name"
            type="text"
            placeholder="LOCAL_MCP_SERVER"
            value={newServer.name}
            onChange={(e) =>
              setNewServer((prev) => ({ ...prev, name: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            className={inputClasses}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="server-url" className={labelClasses}>
            CONNECTION_ENDPOINT
          </label>
          <input
            id="server-url"
            type="url"
            placeholder="https://api.server.com/mcp"
            value={newServer.url}
            onChange={(e) =>
              setNewServer((prev) => ({ ...prev, url: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            className={inputClasses}
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleAddServer}
            loading={addServerLoading}
            disabled={!newServer.name.trim() || !newServer.url.trim()}
            className="h-[38px] px-3"
            title="ESTABLISH_CONNECTION"
          >
            <PlusIcon width="1em" />
          </Button>
        </div>
      </div>
      {addServerError && (
        <div className="mt-4">
          <Message type="error">{addServerError}</Message>
        </div>
      )}
    </div>
  );
}

export default AddHttpServer;
