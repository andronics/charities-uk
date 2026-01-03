/**
 * Base error class for all charity API related errors.
 */
export class CharityApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CharityApiError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CharityApiError);
    }
  }
}

/**
 * Thrown when a charity is not found (404 or empty result).
 */
export class CharityNotFoundError extends CharityApiError {
  constructor(id?: string) {
    super(id ? `Charity not found: ${id}` : 'Charity not found');
    this.name = 'CharityNotFoundError';
  }
}

/**
 * Thrown when the API rate limit is exceeded (429).
 */
export class RateLimitError extends CharityApiError {
  public readonly retryAfter?: number;

  constructor(response?: Response) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    if (response) {
      const retryAfterHeader = response.headers.get('Retry-After');
      this.retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      if (this.retryAfter && isNaN(this.retryAfter)) {
        this.retryAfter = undefined;
      }
    }
  }
}

/**
 * Thrown when authentication fails (401/403).
 */
export class AuthenticationError extends CharityApiError {
  public readonly status: number;

  constructor(response: Response) {
    super(`Authentication failed: ${response.status} ${response.statusText}`);
    this.name = 'AuthenticationError';
    this.status = response.status;
  }
}

/**
 * Thrown when a network error occurs (connection failure, timeout, etc.).
 */
export class NetworkError extends CharityApiError {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    super(`Network error: ${message}`, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown for general API errors (non-2xx responses not covered by specific errors).
 */
export class ApiError extends CharityApiError {
  public readonly status: number;
  public readonly statusText: string;

  constructor(response: Response, body?: string) {
    const message = body
      ? `API error: ${response.status} ${response.statusText} - ${body}`
      : `API error: ${response.status} ${response.statusText}`;
    super(message);
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
  }
}
