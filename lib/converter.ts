import type {OpenAPI} from '@scalar/openapi-types';
import {openapi} from '@scalar/openapi-parser';
import {FetchHTTPClient, HTTPClient} from './http-client.js';

type ToolSchema = {
  name?: string;
  description?: string;
  inputSchema?: any;
}

export class Converter {
  specs: OpenAPI.Document;
  apis: {
    [key: string]: {
      path: string;
      method: string;
      operation: OpenAPI.Operation;
      headers: { [key: string]: any };
      pathParams: { [key: string]: any };
      queryParams: { [key: string]: any };
      requestBody: { [key: string]: any };
    }
  } = {};
  httpClient: HTTPClient;

  constructor(options?: {
    baseURL?: string;
    httpClient?: HTTPClient;
  }) {
    const {baseURL, httpClient} = options || {};
    if (!httpClient) {
      this.httpClient = new FetchHTTPClient({
        baseURL,
      });
    }
    this.httpClient = httpClient;
  }

  /**
   * @description Load OpenAPI specs
   * @param {OpenAPI.Document} specs - OpenAPI specs
   */
  async load(specs: OpenAPI.Document) {
    const {schema} = await openapi().load(specs).upgrade().dereference().get();
    this.specs = schema;
    this.parseAPIs();
  }

  // As a tool name in Claude Desktop is required to match /^[0-9a-zA-z_-]{1,64}$/
  // We need to handle the case where the operationId is not valid
  private getToolName(path: string, method: string, operation: OpenAPI.Operation) {
    const operationId = operation.operationId;
    if (operationId && /^[0-9a-zA-z_-]{1,64}$/.test(operationId)) {
      return operationId.charAt(0).toUpperCase() + operationId.slice(1);
    }
    const key = operationId || `${method}/${path}`;
    // extract words from key
    return key.split(/[^0-9a-zA-z_-]/).filter(Boolean)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }


  private parseAPIs() {
    const operations = this.specs.paths;
    Object.entries(operations).forEach(([path, methods]) => {
      Object.entries(methods as {
        [key: string]: OpenAPI.Operation;
      }).forEach(([method, operation]) => {
        const toolName = this.getToolName(path, method, operation);
        const parameters = operation.parameters;
        const headers = {};
        const pathParams = {};
        const queryParams = {};
        const requestBody = {};
        if (parameters) {
          parameters.forEach((parameter: any) => {
            const property = {
              description: parameter.description,
              required: parameter.required,
              ...parameter.schema,
            };
            switch (parameter.in) {
            case 'header':
              headers[parameter.name] = property;
              break;
            case 'path':
              pathParams[parameter.name] = property;
              break;
            case 'query':
            default:
              queryParams[parameter.name] = property;
            }
          });
        }
        const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
        if (bodySchema && bodySchema?.properties) {
          Object.entries(bodySchema.properties).forEach(([name, property]: [string, any]) => {
            requestBody[name] = {
              description: property.description,
              required: property.required || bodySchema.required?.includes(name),
              ...property,
            };
          });
        }
        this.apis[toolName] = {path, method, operation, headers, pathParams, queryParams, requestBody};
      });
    });
  }


  getToolsList(): ToolSchema[] {
    const tools = [];
    Object.entries(this.apis).forEach(([name, {operation, headers, pathParams, queryParams, requestBody}]) => {
      tools.push({
        name,
        description: operation.summary,
        inputSchema: {
          type: 'object',
          properties: {
            ...headers,
            ...pathParams,
            ...queryParams,
            ...requestBody,
          },
        },
      });
    });
    return tools;
  }

  getToolsCaller() {
    return async (request: any) => {
      try {
        const {name, arguments: args} = request.params;
        const {method, headers: headersSchema, pathParams, queryParams, requestBody} = this.apis[name];
        let {path} = this.apis[name];
        const pathArgs = Object.keys(args).filter((arg: any) => pathParams[arg]);
        pathArgs.forEach((arg: any) => {
          path = path.replace(`{${arg}}`, args[arg]);
        });
        const {headers, params, data} = Object.keys(args).reduce((acc: any, arg: any) => {
          if (headersSchema[arg]) {
            acc.headers[arg] = args[arg];
          }
          if (queryParams[arg]) {
            acc.params[arg] = args[arg];
          }
          if (requestBody[arg]) {
            acc.data[arg] = args[arg];
          }
          return acc;
        }, {headers: {}, params: {}, data: {}});
        const {data: toolResult} = await this.httpClient.request({method, url: path, headers, params, data});
        return {
          toolResult,
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    };
  }
}
