/**
 * Base error class for all application errors
 * All errors thrown by services should be subclasses of this
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to JSON for API response
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
