/**
 * Base error class for all eBay-related errors.
 */
export class CCNIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CCNIError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CCNIError);
    }
  }
}
