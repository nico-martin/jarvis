import { McpState } from "@ai/mcp/McpServer";
import {
  McpServerStore,
  McpServerStoreBuiltIn,
  McpServerStoreHttp,
} from "@ai/types";
import React from "react";

import { HttpTransport, McpServer } from "../index";
import { createBuiltinServer } from "../mcpServers/builtinMcp";
import {
  getBuiltInServers,
  getHttpServers,
  saveBuiltInServers,
  saveHttpServers,
} from "../utils/mcpServerStore";
import McpServerContext from "./McpServerContext";

interface McpServerContextProviderProps {
  children: React.ReactNode;
}

export function McpServerContextProvider({
  children,
}: McpServerContextProviderProps) {
  const [httpServers, setHttpServers] = React.useState<
    Array<McpServerStoreHttp & { server: McpServer }>
  >([]);
  const [builtinServers, setBuiltinServers] = React.useState<
    Array<McpServerStoreBuiltIn & { server: McpServer }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const addHttpServer = async (name: string, url: string) => {
    const serverConfig: McpServerStoreHttp = {
      name: name.trim(),
      url: url.trim(),
      active: false,
      active_tools: [],
    };

    try {
      new URL(serverConfig.url);
    } catch (e) {
      throw new Error(`Invalid URL format: "${serverConfig.url}"`);
    }

    if (httpServers.find((server) => server.url === serverConfig.url)) {
      throw new Error("Server already exists");
    }

    const server = new McpServer({
      clientConfig: { name: serverConfig.name },
    });
    await server.setTransport(new HttpTransport({ url: serverConfig.url }));
    await server.connect();

    if (server.state === McpState.FAILED) {
      throw new Error(
        `Server connection failed - the server may be invalid or unreachable: ${server.error || "Unknown connection error"}`
      );
    }

    if (server.state !== McpState.READY) {
      throw new Error(
        `Server connection incomplete - expected READY state but got ${server.state}`
      );
    }

    setHttpServers((httpServers) => [
      ...httpServers,
      { ...serverConfig, server },
    ]);
  };

  const removeHttpServer = (url: string) => {
    if (!httpServers.find((server) => server.url === url)) {
      throw new Error("Server does not exist exists");
    }

    setHttpServers((httpServers) => {
      const newServers = httpServers.filter((server) => server.url !== url);

      saveHttpServers(
        newServers.map((server) => ({
          name: server.name,
          url: server.url,
          active: server.active,
          active_tools: server.active_tools,
        }))
      );

      return newServers;
    });
  };

  const initializeServers = async () => {
    const httpServers = await Promise.all(
      getHttpServers().map(async (server) => {
        const serverInstance = new McpServer({
          clientConfig: { name: server.name },
        });
        await serverInstance.setTransport(
          new HttpTransport({ url: server.url })
        );
        await serverInstance.connect();
        return { ...server, server: serverInstance };
      })
    );

    const builtinServers = await Promise.all(
      getBuiltInServers().map(async (server) => {
        const serverInstance = new McpServer({
          clientConfig: { name: server.name },
        });
        await serverInstance.setTransport(
          createBuiltinServer(server.serverType)
        );
        await serverInstance.connect();
        return { ...server, server: serverInstance };
      })
    );

    setHttpServers(httpServers);
    setBuiltinServers(builtinServers);
  };

  const updateServerConfig = (serverConfig: McpServerStore) => {
    if ("url" in serverConfig) {
      setHttpServers((servers) => {
        const newServers = servers.map((s) =>
          s.url === serverConfig.url ? { ...s, ...serverConfig } : s
        );

        saveHttpServers(
          newServers.map((server) => ({
            name: server.name,
            url: server.url,
            active: server.active,
            active_tools: server.active_tools,
          }))
        );

        return newServers;
      });
    }

    if ("serverType" in serverConfig) {
      setBuiltinServers((servers) => {
        const newServers = servers.map((s) =>
          s.serverType === serverConfig.serverType
            ? { ...s, ...serverConfig }
            : s
        );

        saveBuiltInServers(
          newServers.map((server) => ({
            name: server.name,
            serverType: server.serverType,
            active: server.active,
            active_tools: server.active_tools,
          }))
        );

        return newServers;
      });
    }
  };

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
    initializeServers()
      .then(() => {
        setIsLoading(false);
      })
      .catch((e) => {
        setIsLoading(false);
        setError(e.message);
      });
  }, []);

  return (
    <McpServerContext
      value={{
        httpServers,
        builtinServers,
        isLoading,
        error,
        addHttpServer,
        removeHttpServer,
        updateServerConfig,
      }}
    >
      {children}
    </McpServerContext>
  );
}

export default McpServerContextProvider;
