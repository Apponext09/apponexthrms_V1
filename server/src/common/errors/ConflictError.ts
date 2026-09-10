import { AppError } from './AppError';

export class ConflictError extends AppError {
  constructor(
    message: string = 'Conflict',
    details?: Record<string, unknown>
  ) {
    super(message, 409, 'CONFLICT', details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
