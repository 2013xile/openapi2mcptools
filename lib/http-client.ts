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

export class FetchHTTPClient implements HTTPClient {
  baseURL?: string;

  constructor(options?: {
    baseURL?: string;
  }) {
    const {baseURL} = options || {};
    this.baseURL = baseURL;
  }

  private getRequestURL(url: string, params: any) {
    if (this.baseURL) {
      if (!this.baseURL.endsWith('/') && !url.startsWith('/')) {
        url = `${this.baseURL}/${url}`;
      }
      if (this.baseURL.endsWith('/') && url.startsWith('/')) {
        url = `${this.baseURL}${url.slice(1)}`;
      }
    }
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }

  async request(requestConfig: RequestConfig) {
    const {url, method, headers, params, data} = requestConfig;
    const requestURL = this.getRequestURL(url, params);
    const response = await fetch(requestURL, {
      method,
      headers,
      body: data,
    });
    const json = await response.json();
    return {data: json};
  }
}

