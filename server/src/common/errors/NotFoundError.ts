import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Not found',
    details?: Record<string, unknown>
  ) {
    super(message, 404, 'NOT_FOUND', details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
