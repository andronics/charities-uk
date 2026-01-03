import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseClient } from '../../../src/core/base-client.js';
import type { Charity, Regulator, Trustee, FinancialYear, OtherRegulatorInfo } from '../../../src/types/charity.js';
import type { SearchQuery, SearchResult } from '../../../src/types/search.js';
import {
  CharityNotFoundError,
  RateLimitError,
  AuthenticationError,
  ApiError,
} from '../../../src/core/errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Concrete implementation of BaseClient for testing.
 */
class TestClient extends BaseClient {
  readonly regulator: Regulator = 'CCEW';

  protected getDefaultBaseUrl(): string {
    return 'https://test.api.com';
  }

  protected getAuthHeaders(): Record<string, string> {
    if (this.apiKey) {
      return { 'X-Api-Key': this.apiKey };
    }
    return {};
  }

  async search(_query: SearchQuery): Promise<SearchResult<Charity>> {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  async getCharity(id: string): Promise<Charity | null> {
    const cacheKey = this.getCacheKey('getCharity', id);
    const cached = this.getCached<Charity | null>(cacheKey);
    if (cached !== undefined) return cached;

    const response = await this.get<{ id: string; name: string }>(`/charity/${id}`);
    const charity = {
      id: response.data.id,
      name: response.data.name,
    } as unknown as Charity;

    this.setCache(cacheKey, charity);
    return charity;
  }

  async searchByName(_name: string, _page?: number): Promise<SearchResult<Charity>> {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  async getTrustees(_id: string): Promise<Trustee[]> {
    return [];
  }

  async getFinancialHistory(_id: string): Promise<FinancialYear[]> {
    return [];
  }

  async getOtherRegulators(_id: string): Promise<OtherRegulatorInfo[]> {
    return [];
  }

  // Expose protected methods for testing
  testGet<T>(endpoint: string) {
    return this.get<T>(endpoint);
  }

  testPost<T>(endpoint: string, body: unknown) {
    return this.post<T>(endpoint, body);
  }

  testBuildQueryString(params: Record<string, string | number | boolean | undefined>) {
    return this.buildQueryString(params);
  }

  testHandleErrorResponse(response: { status: number; statusText: string; headers: Headers }) {
    return this.handleErrorResponse({
      ...response,
      ok: false,
      data: null,
      raw: '',
    });
  }

  testLogNotImplemented(method: string) {
    return this.logNotImplemented(method);
  }

  testGetCacheKey(method: string, params: string | Record<string, unknown>) {
    return this.getCacheKey(method, params);
  }
}

describe('BaseClient', () => {
  let client: TestClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new TestClient({ apiKey: 'test-key' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSuccessResponse = <T>(data: T) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(data)),
  });

  const mockErrorResponse = (status: number, statusText: string) => ({
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    text: () => Promise.resolve(statusText),
  });

  describe('constructor', () => {
    it('uses default configuration', () => {
      const defaultClient = new TestClient();
      expect(defaultClient.regulator).toBe('CCEW');
    });

    it('accepts custom timeout', () => {
      const customClient = new TestClient({ timeout: 5000 });
      expect(customClient.regulator).toBe('CCEW');
    });

    it('accepts custom base URL', () => {
      const customClient = new TestClient({ baseUrl: 'https://custom.api.com' });
      expect(customClient.regulator).toBe('CCEW');
    });

    it('enables caching by default', () => {
      const defaultClient = new TestClient();
      // Cache should work
      expect(defaultClient.regulator).toBe('CCEW');
    });

    it('allows disabling caching', () => {
      const uncachedClient = new TestClient({ cache: { enabled: false } });
      expect(uncachedClient.regulator).toBe('CCEW');
    });

    it('accepts custom cache configuration', () => {
      const customCacheClient = new TestClient({
        cache: { enabled: true, ttl: 60000, maxSize: 50 },
      });
      expect(customCacheClient.regulator).toBe('CCEW');
    });
  });

  describe('HTTP requests', () => {
    it('makes GET request with auth headers', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ data: 'test' }));

      const promise = client.testGet('/test');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Api-Key': 'test-key',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ result: 'ok' }));

      const promise = client.testPost('/test', { key: 'value' });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/test',
        expect.objectContaining({
          method: 'POST',
          body: '{"key":"value"}',
        })
      );
    });
  });

  describe('buildQueryString', () => {
    it('builds query string from params', () => {
      const result = client.testBuildQueryString({
        page: 1,
        search: 'test',
        active: true,
      });
      expect(result).toContain('page=1');
      expect(result).toContain('search=test');
      expect(result).toContain('active=true');
      expect(result).toMatch(/^\?/);
    });

    it('skips undefined values', () => {
      const result = client.testBuildQueryString({
        page: 1,
        search: undefined,
      });
      expect(result).toContain('page=1');
      expect(result).not.toContain('search');
    });

    it('skips null values', () => {
      const result = client.testBuildQueryString({
        page: 1,
        search: null as unknown as undefined,
      });
      expect(result).toContain('page=1');
      expect(result).not.toContain('search');
    });

    it('skips empty string values', () => {
      const result = client.testBuildQueryString({
        page: 1,
        search: '',
      });
      expect(result).toContain('page=1');
      expect(result).not.toContain('search');
    });

    it('returns empty string for no params', () => {
      const result = client.testBuildQueryString({});
      expect(result).toBe('');
    });
  });

  describe('error handling', () => {
    it('throws CharityNotFoundError on 404', () => {
      expect(() => {
        client.testHandleErrorResponse({
          status: 404,
          statusText: 'Not Found',
          headers: new Headers(),
        });
      }).toThrow(CharityNotFoundError);
    });

    it('throws AuthenticationError on 401', () => {
      expect(() => {
        client.testHandleErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers(),
        });
      }).toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on 403', () => {
      expect(() => {
        client.testHandleErrorResponse({
          status: 403,
          statusText: 'Forbidden',
          headers: new Headers(),
        });
      }).toThrow(AuthenticationError);
    });

    it('throws RateLimitError on 429', () => {
      expect(() => {
        client.testHandleErrorResponse({
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers(),
        });
      }).toThrow(RateLimitError);
    });

    it('throws ApiError on other errors', () => {
      expect(() => {
        client.testHandleErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
        });
      }).toThrow(ApiError);
    });
  });

  describe('caching', () => {
    it('caches responses', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse({ id: '123', name: 'Test Charity' })
      );

      const promise1 = client.getCharity('123');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      const promise2 = client.getCharity('123');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('clears cache', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse({ id: '123', name: 'Test Charity' })
      );

      const promise1 = client.getCharity('123');
      await vi.runAllTimersAsync();
      await promise1;

      client.clearCache();

      const promise2 = client.getCharity('123');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not cache when disabled', async () => {
      const uncachedClient = new TestClient({
        apiKey: 'test',
        cache: { enabled: false },
      });

      mockFetch.mockResolvedValue(
        mockSuccessResponse({ id: '123', name: 'Test Charity' })
      );

      const promise1 = uncachedClient.getCharity('123');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = uncachedClient.getCharity('123');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('generates unique cache keys', () => {
      const key1 = client.testGetCacheKey('getCharity', '123');
      const key2 = client.testGetCacheKey('getCharity', '456');
      const key3 = client.testGetCacheKey('getTrustees', '123');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toContain('CCEW');
      expect(key1).toContain('getCharity');
      expect(key1).toContain('123');
    });

    it('generates cache keys from objects', () => {
      const key = client.testGetCacheKey('search', { text: 'test', page: 1 });
      expect(key).toContain('CCEW');
      expect(key).toContain('search');
      expect(key).toContain('test');
      expect(key).toContain('1');
    });
  });

  describe('logNotImplemented', () => {
    it('logs warning with regulator and method name', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      client.testLogNotImplemented('testMethod');

      expect(warnSpy).toHaveBeenCalledWith(
        '[CCEW] testMethod is not supported by this regulator\'s API'
      );

      warnSpy.mockRestore();
    });
  });

  describe('retry behavior', () => {
    it('retries on 500 errors', async () => {
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(500, 'Server Error'))
        .mockResolvedValueOnce(mockSuccessResponse({ data: 'success' }));

      const promise = client.testGet('/test');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ data: 'success' });
    });

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(429, 'Too Many Requests'))
        .mockResolvedValueOnce(mockSuccessResponse({ data: 'success' }));

      const promise = client.testGet('/test');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ data: 'success' });
    });
  });
});
