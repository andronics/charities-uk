import { LRUCache } from 'lru-cache';
import { httpRequest, type HttpRequestOptions, type HttpResponse } from '../utils/http.js';
import type { Charity, Regulator, Trustee, FinancialYear, OtherRegulatorInfo } from '../types/charity.js';
import type { SearchQuery, SearchResult, ClientConfig, CacheConfig } from '../types/search.js';
import {
  CharityNotFoundError,
  RateLimitError,
  AuthenticationError,
  ApiError,
} from './errors.js';

/**
 * Default cache configuration.
 */
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
};

/**
 * Default client configuration.
 */
const DEFAULT_CONFIG: Required<Omit<ClientConfig, 'apiKey' | 'cache'>> = {
  baseUrl: '',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Abstract base client for charity regulator APIs.
 * Provides shared HTTP handling, retry logic, and error mapping.
 */
export abstract class BaseClient {
  /** Regulator identifier */
  abstract readonly regulator: Regulator;

  /** Base URL for API requests */
  protected readonly baseUrl: string;

  /** Optional API key for authentication */
  protected readonly apiKey?: string;

  /** Request timeout in milliseconds */
  protected readonly timeout: number;

  /** Number of retry attempts */
  protected readonly retryAttempts: number;

  /** Base delay between retries */
  protected readonly retryDelay: number;

  /** LRU cache instance (null if caching disabled) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly cache: LRUCache<string, any> | null;

  constructor(config: ClientConfig = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? this.getDefaultBaseUrl();
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.retryAttempts = config.retryAttempts ?? DEFAULT_CONFIG.retryAttempts;
    this.retryDelay = config.retryDelay ?? DEFAULT_CONFIG.retryDelay;

    // Initialize cache if enabled
    const cacheConfig = config.cache ?? {};
    if (cacheConfig.enabled !== false) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cache = new LRUCache<string, any>({
        max: cacheConfig.maxSize ?? DEFAULT_CACHE_CONFIG.maxSize,
        ttl: cacheConfig.ttl ?? DEFAULT_CACHE_CONFIG.ttl,
      });
    } else {
      this.cache = null;
    }
  }

  /**
   * Get the default base URL for this regulator's API.
   */
  protected abstract getDefaultBaseUrl(): string;

  /**
   * Get authentication headers for this regulator.
   * Returns empty object if no auth required.
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Search for charities.
   */
  abstract search(query: SearchQuery): Promise<SearchResult<Charity>>;

  /**
   * Get a single charity by ID.
   * Returns null if not found.
   */
  abstract getCharity(id: string): Promise<Charity | null>;

  /**
   * Search for charities by name.
   * Returns empty results if not supported by regulator.
   */
  abstract searchByName(name: string, page?: number): Promise<SearchResult<Charity>>;

  /**
   * Get trustees for a charity.
   * Returns empty array if not supported by regulator.
   */
  abstract getTrustees(id: string): Promise<Trustee[]>;

  /**
   * Get financial history for a charity.
   * Returns empty array if not supported by regulator.
   */
  abstract getFinancialHistory(id: string): Promise<FinancialYear[]>;

  /**
   * Get other regulators where the charity is registered.
   * Returns empty array if not supported by regulator.
   */
  abstract getOtherRegulators(id: string): Promise<OtherRegulatorInfo[]>;

  /**
   * Log a warning that a method is not implemented for this regulator.
   */
  protected logNotImplemented(method: string): void {
    console.warn(`[${this.regulator}] ${method} is not supported by this regulator's API`);
  }

  /**
   * Make an HTTP request with retry and error handling.
   */
  protected async request<T>(
    endpoint: string,
    options: Omit<HttpRequestOptions, 'timeout' | 'retry'> = {}
  ): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await httpRequest<T>(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      timeout: this.timeout,
      retry: {
        maxRetries: this.retryAttempts,
        delayMs: this.retryDelay,
      },
    });

    // Handle error responses
    if (!response.ok) {
      this.handleErrorResponse(response);
    }

    return response;
  }

  /**
   * Make a GET request.
   */
  protected get<T>(
    endpoint: string,
    options: Omit<HttpRequestOptions, 'method' | 'body' | 'timeout' | 'retry'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request.
   */
  protected post<T>(
    endpoint: string,
    body: unknown,
    options: Omit<HttpRequestOptions, 'method' | 'body' | 'timeout' | 'retry'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body as string | object,
    });
  }

  /**
   * Handle non-2xx HTTP responses by throwing appropriate errors.
   */
  protected handleErrorResponse(response: HttpResponse<unknown>): never {
    const fakeResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    } as Response;

    switch (response.status) {
      case 401:
      case 403:
        throw new AuthenticationError(fakeResponse);
      case 404:
        throw new CharityNotFoundError();
      case 429:
        throw new RateLimitError(fakeResponse);
      default:
        throw new ApiError(fakeResponse, response.raw);
    }
  }

  /**
   * Build a query string from parameters.
   */
  protected buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Generate a cache key for a method call.
   */
  protected getCacheKey(method: string, params: string | Record<string, unknown>): string {
    const paramsStr = typeof params === 'string' ? params : JSON.stringify(params);
    return `${this.regulator}:${method}:${paramsStr}`;
  }

  /**
   * Get a value from the cache.
   */
  protected getCached<T>(key: string): T | undefined {
    return this.cache?.get(key) as T | undefined;
  }

  /**
   * Set a value in the cache.
   */
  protected setCache<T>(key: string, value: T): void {
    this.cache?.set(key, value);
  }

  /**
   * Clear all cached entries.
   */
  public clearCache(): void {
    this.cache?.clear();
  }
}
