import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Unauthorized',
    details?: Record<string, unknown>
  ) {
    super(message, 401, 'UNAUTHORIZED', details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
