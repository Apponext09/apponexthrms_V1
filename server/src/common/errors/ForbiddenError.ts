import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Forbidden',
    details?: Record<string, unknown>
  ) {
    super(message, 403, 'FORBIDDEN', details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
