import { describe, it, expect } from 'vitest';
import { Converter } from '../lib/converter';
import sample from './sample-github.json';
import { HTTPClient } from '../lib/http-client';

describe('get tools list', () => {
  it('get tools list', async () => {
    const converter = new Converter();
    await converter.load(sample);
    const apis = converter.apis;
    const names = Object.keys(apis);
    expect(names).toEqual(['ListPets', 'CreatePets', 'GetPetsPetId']);
    const tools = converter.getToolsList();
    const createPets = tools.find((tool) => tool.name === 'CreatePets');
    expect(createPets).toBeDefined();
    expect(createPets).toMatchObject({
      name: 'CreatePets',
      description: 'Create a pet',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
          tag: {
            type: 'string',
          },
        },
      },
    });
  });
});


describe('get tools caller', () => {
  let result: any;
  let converter: Converter;
  class MockHTTPClient implements HTTPClient {
    async request(requestConfig: any) {
      result = requestConfig;
      return { data: {} };
    }
  }
  it('get tools caller', async () => {
    converter = new Converter({
      httpClient: new MockHTTPClient(),
    });
    await converter.load(sample);
    const toolsCaller = converter.getToolsCaller();
    await toolsCaller({
      params: {
        name: 'ListPets',
        arguments: {
          limit: 10,
        },
      },
    });
    expect(result).toMatchObject({
      url: '/pets',
      method: 'get',
      params: {
        limit: 10,
      },
    });
    await toolsCaller({
      params: {
        name: 'CreatePets',
        arguments: {
          id: 1,
          name: 'dog',
          tag: 'pet',
        },
      },
    });
    expect(result).toMatchObject({
      url: '/pets',
      method: 'post',
      data: {
        id: 1,
        name: 'dog',
        tag: 'pet',
      },
    });
    await toolsCaller({
      params: {
        name: 'GetPetsPetId',
        arguments: {
          petId: 1,
        },
      },
    });
    expect(result).toMatchObject({
      url: '/pets/1',
      method: 'get',
    });
  });
});

