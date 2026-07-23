import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load .env file (check local server dir then root workspace dir)
dotenv.config({ path: resolve('.env') });
dotenv.config({ path: resolve('../.env') });

// Helper to load keys from files if not in env
function getJwtPrivateKey(): string {
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY;
  }
  try {
    return readFileSync(resolve('./keys/private.key'), 'utf-8');
  } catch {
    return '';
  }
}

function getJwtPublicKey(): string {
  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY;
  }
  try {
    return readFileSync(resolve('./keys/public.key'), 'utf-8');
  } catch {
    return '';
  }
}

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_URL: z.string().url().optional(),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('root'),
  DB_NAME: z.string().default('apponexthrms'),

  // JWT
  JWT_PRIVATE_KEY: z.string().default(getJwtPrivateKey()),
  JWT_PUBLIC_KEY: z.string().default(getJwtPublicKey()),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Email (optional for now, required in Phase 2)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Features
  ENABLE_MFA: z.string().transform(v => v === 'true').default('false'),
  ENABLE_SSO: z.string().transform(v => v === 'true').default('false'),
  ENABLE_IP_RESTRICTION: z.string().transform(v => v === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.errors.forEach((error) => {
      console.error(`  ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
