import { defaultBuiltinServers } from "@ai/mcp/mcpServers/builtinMcp";
import { McpBuiltinServer, McpHttpServer } from "@ai/types";
import { PlusIcon, PowerIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Modal } from "@theme";
import { localStorage } from "@utils/LocalStorage";
import cn from "@utils/classnames";
import {
  MCP_BUILTIN_SERVERS_STORAGE_KEY,
  MCP_SERVERS_STORAGE_KEY,
} from "@utils/constants";
import React from "react";

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-stone-600";
const buttonOutlineClasses = "variant-outline size-sm";
const statusDotClasses = "h-2 w-2 rounded-full";
const truncateClasses = "truncate text-sm font-medium";
const urlClasses = "truncate text-xs";

interface McpSettingsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function McpSettings({ open, setOpen }: McpSettingsProps) {
  const [servers, setServers] = React.useState<McpHttpServer[]>([]);
  const [builtinServers, setBuiltinServers] = React.useState<
    McpBuiltinServer[]
  >(defaultBuiltinServers);
  const [newServer, setNewServer] = React.useState({ name: "", url: "" });

  React.useEffect(() => {
    const stored = localStorage.getItem<McpHttpServer[]>(
      MCP_SERVERS_STORAGE_KEY
    );
    if (stored) {
      setServers(stored);
    }

    const storedBuiltin = localStorage.getItem<McpBuiltinServer[]>(
      MCP_BUILTIN_SERVERS_STORAGE_KEY
    );
    if (storedBuiltin) {
      setBuiltinServers(storedBuiltin);
    }

    const unsubscribeHttp = localStorage.onItemChange<McpHttpServer[]>(
      MCP_SERVERS_STORAGE_KEY,
      (key, newValue) => {
        setServers(newValue || []);
      }
    );

    const unsubscribeBuiltin = localStorage.onItemChange<McpBuiltinServer[]>(
      MCP_BUILTIN_SERVERS_STORAGE_KEY,
      (key, newValue) => {
        setBuiltinServers(newValue || defaultBuiltinServers);
      }
    );

    return () => {
      unsubscribeHttp();
      unsubscribeBuiltin();
    };
  }, []);

  const handleAddServer = () => {
    if (!newServer.name.trim() || !newServer.url.trim()) {
      return;
    }

    const server: McpHttpServer = {
      id: crypto.randomUUID(),
      name: newServer.name.trim(),
      url: newServer.url.trim(),
      active: true, // New servers are active by default
    };

    setServers((prev) => [...prev, server]);
    setNewServer({ name: "", url: "" });
  };

  const handleRemoveServer = (id: string) => {
    setServers((prev) => prev.filter((server) => server.id !== id));
  };

  const handleToggleServer = (id: string) => {
    setServers((prev) =>
      prev.map((server) =>
        server.id === id ? { ...server, active: !server.active } : server
      )
    );
  };

  const handleToggleBuiltinServer = (id: string) => {
    setBuiltinServers((prev) =>
      prev.map((server) =>
        server.id === id ? { ...server, active: !server.active } : server
      )
    );
  };

  const handleSave = () => {
    localStorage.setItem(MCP_SERVERS_STORAGE_KEY, servers);
    localStorage.setItem(MCP_BUILTIN_SERVERS_STORAGE_KEY, builtinServers);
    setOpen(false);
  };

  const handleCancel = () => {
    const stored = localStorage.getItem<McpHttpServer[]>(
      MCP_SERVERS_STORAGE_KEY
    );
    setServers(stored || []);

    const storedBuiltin = localStorage.getItem<McpBuiltinServer[]>(
      MCP_BUILTIN_SERVERS_STORAGE_KEY
    );
    setBuiltinServers(storedBuiltin || defaultBuiltinServers);

    setNewServer({ name: "", url: "" });
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newServer.name.trim() && newServer.url.trim()) {
      e.preventDefault();
      handleAddServer();
    }
  };

  return (
    <Modal open={open} setOpen={setOpen} title="MCP Server Settings" size="lg">
      <div className="space-y-6">
        {/* Built-in Servers */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-stone-700">
            Built-in Servers
          </h3>
          <div className="space-y-2">
            {builtinServers.map((server) => (
              <div
                key={server.id}
                className={cn(
                  "flex items-center justify-between rounded-md border p-3",
                  {
                    "border-stone-200 bg-stone-50": server.active,
                    "border-stone-300 bg-stone-100": !server.active,
                  }
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(statusDotClasses, {
                        "bg-green-500": server.active,
                        "bg-stone-400": !server.active,
                      })}
                    />
                    <p
                      className={cn(truncateClasses, {
                        "text-stone-800": server.active,
                        "text-stone-500": !server.active,
                      })}
                    >
                      {server.name}
                    </p>
                    <span
                      className={cn("text-xs", {
                        "text-green-600": server.active,
                        "text-stone-400": !server.active,
                      })}
                    >
                      {server.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p
                    className={cn(urlClasses, {
                      "text-stone-500": server.active,
                      "text-stone-400": !server.active,
                    })}
                  >
                    {server.description}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleBuiltinServer(server.id)}
                    className={cn({
                      "text-amber-600 hover:bg-amber-50 hover:text-amber-700":
                        server.active,
                      "text-green-600 hover:bg-green-50 hover:text-green-700":
                        !server.active,
                    })}
                    title={
                      server.active ? "Deactivate server" : "Activate server"
                    }
                  >
                    <PowerIcon width="1em" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HTTP Server List */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-stone-700">
            HTTP Servers
          </h3>
          {servers.length === 0 ? (
            <p className="text-sm text-stone-500 italic">
              No servers configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-3",
                    {
                      "border-stone-200 bg-stone-50": server.active,
                      "border-stone-300 bg-stone-100": !server.active,
                    }
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(statusDotClasses, {
                          "bg-green-500": server.active,
                          "bg-stone-400": !server.active,
                        })}
                      />
                      <p
                        className={cn(truncateClasses, {
                          "text-stone-800": server.active,
                          "text-stone-500": !server.active,
                        })}
                      >
                        {server.name}
                      </p>
                      <span
                        className={cn("text-xs", {
                          "text-green-600": server.active,
                          "text-stone-400": !server.active,
                        })}
                      >
                        {server.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p
                      className={cn(urlClasses, {
                        "text-stone-500": server.active,
                        "text-stone-400": !server.active,
                      })}
                    >
                      {server.url}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleServer(server.id)}
                      className={cn({
                        "text-amber-600 hover:bg-amber-50 hover:text-amber-700":
                          server.active,
                        "text-green-600 hover:bg-green-50 hover:text-green-700":
                          !server.active,
                      })}
                      title={
                        server.active ? "Deactivate server" : "Activate server"
                      }
                    >
                      <PowerIcon width="1em" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveServer(server.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Remove server"
                    >
                      <TrashIcon width="1em" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-stone-700">
            Add New Server
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
                disabled={!newServer.name.trim() || !newServer.url.trim()}
                className="h-[38px] px-3"
                title="Add Server"
              >
                <PlusIcon width="1em" />
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 border-t border-stone-200 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

export default McpSettings;
