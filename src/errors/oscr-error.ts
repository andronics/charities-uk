/**
 * Base error class for all OSCR-related errors.
 */
export class OSCRError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OSCRError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OSCRError);
    }
  }
}
