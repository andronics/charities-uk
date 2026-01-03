/**
 * Base error class for all CCNI-related errors.
 */
export class CCEWError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CCEWError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CCEWError);
    }
  }
}
