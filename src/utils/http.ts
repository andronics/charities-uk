import { NetworkError } from '../core/errors.js';

/**
 * Retry configuration options.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  delayMs: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs?: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  exponentialBackoff: true,
  maxDelayMs: 10000,
};

/**
 * HTTP request options.
 */
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
  timeout?: number;
  retry?: Partial<RetryConfig>;
}

/**
 * HTTP response wrapper.
 */
export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  data: T;
  raw: string;
}

/**
 * Determine if an error is retryable.
 */
function isRetryable(status: number): boolean {
  // Retry on server errors and specific client errors
  return (
    status >= 500 || // Server errors
    status === 408 || // Request timeout
    status === 429 || // Rate limited
    status === 0 // Network error
  );
}

/**
 * Calculate delay for retry attempt with optional exponential backoff.
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.delayMs;

  if (config.exponentialBackoff) {
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, config.maxDelayMs ?? 10000);
  }

  return baseDelay;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request with automatic retries.
 *
 * @param url - The URL to request
 * @param options - Request options
 * @returns Response data
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    retry: retryOverrides,
  } = options;

  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryOverrides,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Prepare request body
      let requestBody: string | undefined;
      if (body !== undefined) {
        requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Make request
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Get response text
      const responseText = await response.text();

      // Check if we should retry
      if (!response.ok && isRetryable(response.status) && attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
        continue;
      }

      // Parse response data
      let data: T;
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText) as T;
        } catch {
          data = responseText as T;
        }
      } else {
        data = responseText as T;
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        raw: responseText,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isNetworkError =
        lastError.name === 'AbortError' ||
        lastError.name === 'TypeError' ||
        lastError.message.includes('fetch');

      if (isNetworkError && attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries exceeded
      throw new NetworkError(lastError);
    }
  }

  // Should not reach here, but just in case
  throw new NetworkError(lastError ?? new Error('HTTP request failed'));
}

/**
 * Make a GET request.
 */
export function httpGet<T = unknown>(
  url: string,
  options: Omit<HttpRequestOptions, 'method' | 'body'> = {}
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request.
 */
export function httpPost<T = unknown>(
  url: string,
  body: string | object,
  options: Omit<HttpRequestOptions, 'method' | 'body'> = {}
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'POST', body });
}
