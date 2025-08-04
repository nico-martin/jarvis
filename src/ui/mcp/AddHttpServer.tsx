import useMcpServer from "@ai/mcp/react/useMcpServer";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button, InputText, Message } from "@theme";
import cn from "@utils/classnames";
import { useState } from "preact/hooks";
import { JSX } from "preact";

interface AddHttpServerProps {
  className?: string;
}

function AddHttpServer({ className = "" }: AddHttpServerProps) {
  const { addHttpServer } = useMcpServer();

  const [newServer, setNewServer] = useState({ name: "", url: "" });
  const [addServerError, setAddServerError] = useState<string | null>(
    null
  );
  const [addServerLoading, setAddServerLoading] =
    useState<boolean>(false);

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

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newServer.name.trim() && newServer.url.trim()) {
      e.preventDefault();
      handleAddServer();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium">INITIALIZE_HTTP_SERVER_CONNECTION</h3>
      <div className="flex gap-3">
        <InputText
          name="server-name"
          id="server-name"
          placeholder="LOCAL_MCP_SERVER"
          label="SERVER_DESIGNATION"
          value={newServer.name}
          onChange={(e) =>
            setNewServer((prev) => ({ ...prev, name: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          className="w-full"
        />
        <InputText
          name="server-url"
          id="server-url"
          type="url"
          label="CONNECTION_ENDPOINT"
          placeholder="https://api.server.com/mcp"
          value={newServer.url}
          onChange={(e) =>
            setNewServer((prev) => ({ ...prev, url: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          className="w-full"
        />
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
      {addServerError && <Message type="error">{addServerError}</Message>}
    </div>
  );
}

export default AddHttpServer;
