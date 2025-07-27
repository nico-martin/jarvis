export {
  McpServer,
  McpState,
  type McpConfig,
  type McpCallbacks,
  type McpTransport,
} from "./McpServer";

export { HttpTransport, type HttpTransportConfig } from "./HttpTransport";

export {
  PromiseTransport,
  type PromiseTransportConfig,
} from "./PromiseTransport";

// Usage examples:
//
// 1. HTTP Transport:
// const httpTransport = new HttpTransport({
//   url: 'https://api.example.com/mcp',
//   customHeaders: {
//     'Authorization': 'Bearer token123'
//   }
// });
//
// const mcp = new Mcp({
//   clientConfig: { name: 'MyApp', version: '1.0.0' },
//   autoReconnect: true
// }, {
//   onStateChange: (state) => console.log('MCP State:', state),
//   onToolsChange: (tools) => console.log('Tools loaded:', tools.length)
// });
//
// await mcp.setTransport(httpTransport);
// await mcp.connect();
//
// 2. Promise Transport for browser execution:
// const promiseTransport = new PromiseTransport({
//   executeRequest: async (request) => {
//     // Execute MCP request locally in browser
//     // Could use WebWorkers, IndexedDB, etc.
//     return await executeLocalMcpRequest(request);
//   }
// });
//
// await mcp.setTransport(promiseTransport);
// await mcp.connect();
