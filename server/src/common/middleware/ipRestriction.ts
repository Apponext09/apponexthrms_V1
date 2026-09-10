import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { getEnv } from '../../config/env';
import ipaddr from 'ipaddr.js';

/**
 * IP Restriction middleware: check if client IP is allowed
 * Runs third in middleware chain (after resolveTenant)
 * Can be enabled/disabled via ENABLE_IP_RESTRICTION env var
 */
export function ipRestriction(req: Request, res: Response, next: NextFunction): void {
  const env = getEnv();

  if (!env.ENABLE_IP_RESTRICTION) {
    next();
    return;
  }

  // For Phase 1, this is a stub
  // Phase 2 will implement organization-level IP restrictions
  next();
}

/**
 * Check if IP address is within allowed ranges
 */
export function isIpAllowed(clientIp: string, allowedRanges: string[] | null | undefined): boolean {
  if (!allowedRanges || allowedRanges.length === 0) {
    return true; // No restrictions
  }

  try {
    const addr = ipaddr.process(clientIp);

    for (const range of allowedRanges) {
      if (range.includes('/')) {
        // CIDR notation
        const [ip, prefix] = range.split('/');
        const prefixLength = parseInt(prefix, 10);

        if (addr.kind() === 'ipv4') {
          const ipv4 = ipaddr.IPv4.parse(ip);
          if (ipaddr.IPv4.isValidCIDR(`${ip}/${prefix}`)) {
            const parsed = ipaddr.IPv4.parse(ip);
            if (addr.match(parsed, prefixLength)) {
              return true;
            }
          }
        } else if (addr.kind() === 'ipv6') {
          if (ipaddr.IPv6.isValidCIDR(`${ip}/${prefix}`)) {
            const parsed = ipaddr.IPv6.parse(ip);
            if (addr.match(parsed, prefixLength)) {
              return true;
            }
          }
        }
      } else {
        // Exact match
        if (addr.toString() === range) {
          return true;
        }
      }
    }

    return false;
  } catch {
    // Invalid IP format, reject
    return false;
  }
}

/**
 * Get client IP address from request
 * SECURITY: Only trust X-Forwarded-For from trusted proxies to prevent spoofing
 */
export function getClientIp(req: Request): string {
  const env = getEnv();

  // Check if request is from a trusted proxy
  const remoteAddr = req.socket.remoteAddress || '';
  const trustedProxies = (env.TRUSTED_PROXIES || 'localhost,127.0.0.1').split(',').map(ip => ip.trim());

  // Only use X-Forwarded-For if from trusted proxy
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && trustedProxies.includes(remoteAddr)) {
    return forwarded.split(',')[0].trim();
  }

  // Fall back to direct connection IP
  return remoteAddr || 'unknown';
}
