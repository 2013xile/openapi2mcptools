# OPENAPI Specifications => MCP (Model Context Protocol) Tools

- 🔧 An utility library for converting OpenAPI specifications to MCP tools.   
- 🚀 Faster the development of MCP servers based on OPENAPI specifications.

## Usage

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Converter } from 'openapi2mcptools';

const converter = new Converter({
  baseURL, // optional
  httpClient // optional
});
await converter.load({
  // specs
});
const tools = converter.getToolsList();
const toolCaller = converter.getToolsCaller();

const server = new Server(
  {
    name: 'mcp-server-openapi',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await toolCaller(request);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Custom client

Set `baseURL`, `headers`, etc for http client.

```ts
export type RequestConfig = {
  url?: string;
  method?: string;
  headers?: any;
  params?: any;
  data?: any;
}

export interface HTTPClient {
  request: (requestConfig: RequestConfig) => Promise<{ data: any }>;
}
```

Example:

```ts
import axios from axios;
import { Converter } from 'openapi2mcptools';

const converter = new Converter({
  httpClient: axios
});
```
