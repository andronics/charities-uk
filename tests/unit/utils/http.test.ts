import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  httpRequest,
  httpGet,
  httpPost,
  DEFAULT_RETRY_CONFIG,
} from '../../../src/utils/http.js';
import { CCNIError } from '../../../src/errors/ccni-error.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('http utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.delayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.exponentialBackoff).toBe(true);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(10000);
    });
  });

  describe('httpRequest', () => {
    it('makes successful GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('Hello World'),
      });

      const promise = httpRequest('https://example.com');
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toBe('Hello World');
    });

    it('parses JSON response', async () => {
      const jsonData = { message: 'success', count: 42 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(jsonData)),
      });

      const promise = httpRequest<{ message: string; count: number }>(
        'https://example.com'
      );
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response.data).toEqual(jsonData);
    });

    it('handles invalid JSON gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('not valid json'),
      });

      const promise = httpRequest('https://example.com');
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response.data).toBe('not valid json');
    });

    it('sends POST with string body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpRequest('https://example.com', {
        method: 'POST',
        body: 'raw body content',
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'POST',
          body: 'raw body content',
        })
      );
    });

    it('serializes object body to JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpRequest('https://example.com', {
        method: 'POST',
        body: { key: 'value' },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          body: '{"key":"value"}',
        })
      );
    });

    it('includes custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpRequest('https://example.com', {
        headers: { Authorization: 'Bearer token', 'X-Custom': 'value' },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: { Authorization: 'Bearer token', 'X-Custom': 'value' },
        })
      );
    });

    it('retries on 500 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          text: () => Promise.resolve('Server Error'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('Success'),
        });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 3, delayMs: 100 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers(),
          text: () => Promise.resolve('Rate limited'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('Success'),
        });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 1, delayMs: 100 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('retries on 408 timeout', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 408,
          statusText: 'Request Timeout',
          headers: new Headers(),
          text: () => Promise.resolve('Timeout'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('Success'),
        });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 1, delayMs: 100 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 400 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        text: () => Promise.resolve('Bad Request'),
      });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 3 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(400);
    });

    it('does not retry on 401 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        text: () => Promise.resolve('Unauthorized'),
      });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 3 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(401);
    });

    it('stops retrying after maxRetries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: () => Promise.resolve('Server Error'),
      });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 2, delayMs: 100 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      // Initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(500);
    });

    it('retries on network error (TypeError)', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('Success'),
        });

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 1, delayMs: 100 },
      });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('throws CCNIError after all retries fail', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      const promise = httpRequest('https://example.com', {
        retry: { maxRetries: 2, delayMs: 100 },
      });

      // Run timers and catch the expected error
      let caughtError: Error | undefined;
      const errorPromise = promise.catch((err) => {
        caughtError = err;
      });

      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(CCNIError);
      expect(caughtError?.message).toMatch(/HTTP request failed after 3 attempt/);
    });

    it('returns raw response text', async () => {
      const rawText = '<xml>response</xml>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/xml' }),
        text: () => Promise.resolve(rawText),
      });

      const promise = httpRequest('https://example.com');
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response.raw).toBe(rawText);
    });
  });

  describe('httpGet', () => {
    it('makes GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpGet('https://example.com');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('passes headers through', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpGet('https://example.com', {
        headers: { Accept: 'application/json' },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });
  });

  describe('httpPost', () => {
    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpPost('https://example.com', 'body content');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'POST',
          body: 'body content',
        })
      );
    });

    it('serializes object body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpPost('https://example.com', { data: 'value' });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          body: '{"data":"value"}',
        })
      );
    });

    it('passes headers through', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('OK'),
      });

      const promise = httpPost('https://example.com', 'body', {
        headers: { 'Content-Type': 'text/xml' },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: { 'Content-Type': 'text/xml' },
        })
      );
    });
  });
});
