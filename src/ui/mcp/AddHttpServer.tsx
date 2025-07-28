import { PlusIcon } from "@heroicons/react/24/outline";
import { Button, Message } from "@theme";
import cn from "@utils/classnames";
import React from "react";

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-stone-600";

interface AddHttpServerProps {
  onAddServer: (name: string, url: string) => Promise<void>;
  className?: string;
}

function AddHttpServer({ onAddServer, className = "" }: AddHttpServerProps) {
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
      await onAddServer(newServer.name.trim(), newServer.url.trim());
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
        "rounded-lg border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-medium text-stone-700">
        Add New HTTP Server
      </h3>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="server-name" className={labelClasses}>
            Server Name
          </label>
          <input
            id="server-name"
            type="text"
            placeholder="e.g., Local Server"
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
            Server URL
          </label>
          <input
            id="server-url"
            type="url"
            placeholder="https://api.example.com/mcp"
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
            title="Add Server"
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
