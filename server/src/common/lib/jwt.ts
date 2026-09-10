import jwt from 'jsonwebtoken';
import type { JwtClaims } from '@apponexthrms/shared';
import { getEnv } from '../../config/env';

/**
 * Generate an RS256 access token (15 minutes)
 */
export function generateAccessToken(claims: Omit<JwtClaims, 'iat' | 'exp'>): string {
  const env = getEnv();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getExpiresInSeconds(env.JWT_EXPIRES_IN);

  const payload: JwtClaims = {
    ...claims,
    iat: now,
    exp: now + expiresIn,
  };

  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
  });
}

/**
 * Generate an RS256 refresh token (7 days)
 */
export function generateRefreshToken(claims: Omit<JwtClaims, 'iat' | 'exp'>): string {
  const env = getEnv();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getExpiresInSeconds(env.JWT_REFRESH_EXPIRES_IN);

  const payload: JwtClaims = {
    ...claims,
    iat: now,
    exp: now + expiresIn,
  };

  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtClaims {
  const env = getEnv();

  try {
    const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
    });

    return decoded as JwtClaims;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for refresh flow)
 */
export function decodeToken(token: string): JwtClaims | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtClaims;
  } catch {
    return null;
  }
}

/**
 * Parse expiration time string to seconds
 * Supports formats like "15m", "7d", "24h", "30s"
 */
function getExpiresInSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp <= now;
}

/**
 * Get remaining time until token expiration (in seconds)
 */
export function getTokenTTL(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}
