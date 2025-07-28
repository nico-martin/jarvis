import { McpState } from "@ai/mcp";
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
import type { McpServerWithState } from "./types";

interface McpServerContextProviderProps {
  children: React.ReactNode;
}

export function McpServerContextProvider({
  children,
}: McpServerContextProviderProps) {
  const [httpServers, setHttpServers] = React.useState<
    Array<McpServerStoreHttp & McpServerWithState>
  >([]);
  const [builtinServers, setBuiltinServers] = React.useState<
    Array<McpServerStoreBuiltIn & McpServerWithState>
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  // Helper function to create server with state tracking
  const createServerWithState = (
    serverConfig: McpServerStore
  ): McpServerWithState => {
    const server = new McpServer(
      {
        clientConfig: { name: serverConfig.name },
      },
      {
        onStateChange: (newState: McpState) => {
          const updateServerState = (servers: any[]) =>
            servers.map((s) => {
              if (s.server === server) {
                return {
                  ...s,
                  state: newState,
                  error: server.error,
                  lastStateChange: new Date(),
                };
              }
              return s;
            });

          if ("url" in serverConfig) {
            setHttpServers(updateServerState);
          } else {
            setBuiltinServers(updateServerState);
          }
        },
        onError: (error: string) => {
          const updateServerError = (servers: any[]) =>
            servers.map((s) => {
              if (s.server === server) {
                return {
                  ...s,
                  error,
                  lastStateChange: new Date(),
                };
              }
              return s;
            });

          if ("url" in serverConfig) {
            setHttpServers(updateServerError);
          } else {
            setBuiltinServers(updateServerError);
          }
        },
      }
    );

    return {
      server,
      state: server.state,
      error: server.error,
      lastStateChange: new Date(),
    };
  };

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

    const serverWithState = createServerWithState(serverConfig);
    const { server } = serverWithState;

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

    const newServerEntry: McpServerStoreHttp & McpServerWithState = {
      ...serverConfig,
      ...serverWithState,
      state: server.state,
      error: server.error,
    };
    setHttpServers((httpServers) => [...httpServers, newServerEntry]);
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
    // Immediately show servers in CONNECTING state
    const initialHttpServers = getHttpServers().map((serverConfig) => {
      const serverWithState = createServerWithState(serverConfig);
      return {
        ...serverConfig,
        ...serverWithState,
        state: McpState.CONNECTING,
      };
    });

    const initialBuiltinServers = getBuiltInServers().map((serverConfig) => {
      const serverWithState = createServerWithState(serverConfig);
      return {
        ...serverConfig,
        ...serverWithState,
        state: McpState.CONNECTING,
      };
    });

    setHttpServers(initialHttpServers);
    setBuiltinServers(initialBuiltinServers);

    // Connect HTTP servers in parallel
    Promise.allSettled(
      getHttpServers().map(async (serverConfig) => {
        try {
          const serverWithState = createServerWithState(serverConfig);
          const { server } = serverWithState;

          await server.setTransport(
            new HttpTransport({ url: serverConfig.url })
          );
          await server.connect();

          // Update this specific server's state
          setHttpServers((prevServers) =>
            prevServers.map((s) =>
              s.url === serverConfig.url
                ? {
                    ...s,
                    server,
                    state: server.state,
                    error: server.error,
                  }
                : s
            )
          );
        } catch (error) {
          // Update this specific server's error state
          setHttpServers((prevServers) =>
            prevServers.map((s) =>
              s.url === serverConfig.url
                ? {
                    ...s,
                    state: McpState.FAILED,
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                : s
            )
          );
        }
      })
    );

    // Connect builtin servers in parallel
    Promise.allSettled(
      getBuiltInServers().map(async (serverConfig) => {
        try {
          const serverWithState = createServerWithState(serverConfig);
          const { server } = serverWithState;

          await server.setTransport(
            createBuiltinServer(serverConfig.serverType)
          );
          await server.connect();

          // Update this specific server's state
          setBuiltinServers((prevServers) =>
            prevServers.map((s) =>
              s.serverType === serverConfig.serverType
                ? {
                    ...s,
                    server,
                    state: server.state,
                    error: server.error,
                  }
                : s
            )
          );
        } catch (error) {
          // Update this specific server's error state
          setBuiltinServers((prevServers) =>
            prevServers.map((s) =>
              s.serverType === serverConfig.serverType
                ? {
                    ...s,
                    state: McpState.FAILED,
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                : s
            )
          );
        }
      })
    );
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
    setError(null);
    initializeServers().catch((e) => {
      setError(e.message);
    });
  }, []);

  return (
    <McpServerContext
      value={{
        httpServers,
        builtinServers,
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
