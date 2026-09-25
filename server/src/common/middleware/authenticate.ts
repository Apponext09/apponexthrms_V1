import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { verifyToken } from '../lib/jwt';
import { getKnex } from '../../db/knex';
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
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    token = cookies['accessToken'];
  }

  if (!token) {
    next(new UnauthorizedError('Missing or invalid authorization token'));
    return;
  }

  try {
    const claims = verifyToken(token);
    // JWTs are not enough after offboarding: the linked user is checked on
    // every request so an already-issued token stops working immediately.
    const userId = Number(claims.sub);
    const organizationId = Number(claims.oid);
    if (Number.isInteger(userId) && userId > 0 && Number.isInteger(organizationId) && organizationId > 0) {
      const user = await getKnex()('users')
        .where({ id: userId, organization_id: organizationId })
        .select('status')
        .first();
      if (user && user.status !== 'active') {
        throw new UnauthorizedError('Your company access has been revoked. Please contact HR.');
      }
    }
    req.user = claims;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    next(new UnauthorizedError(message));
  }
}
