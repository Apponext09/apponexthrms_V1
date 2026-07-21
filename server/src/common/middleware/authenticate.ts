import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { verifyToken } from '../lib/jwt';
import type { JwtClaims } from '@apponexthrms/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
    }
  }
}

/**
 * Authenticate middleware: verify JWT token from Authorization header
 * Runs first in middleware chain
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const claims = verifyToken(token);
    req.user = claims;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    throw new UnauthorizedError(message);
  }
}
