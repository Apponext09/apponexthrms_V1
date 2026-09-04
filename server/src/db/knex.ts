import knex from 'knex';
import type { Knex } from 'knex';
import { getEnv } from '../config/env';

let instance: Knex | null = null;

/**
 * Convert snake_case column names from DB to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case for DB columns
 */
function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Identifier wrapper: wraps column/table names in backticks for MySQL
 * Knex calls this to format identifiers for the database
 */
const wrapIdentifier: any = (value: string) => {
  if (value === '*') {
    return value;
  }
  return `\`${value}\``;
};

/**
 * Initialize Knex instance with camelCase/snake_case hooks
 */
export function initializeKnex(): Knex {
  if (instance) {
    return instance;
  }

  const env = getEnv();

  instance = knex({
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      charset: 'utf8mb4',
      // Return DATE/DATETIME columns as plain strings (e.g. '2026-09-04') instead of
      // JS Date objects. This avoids mysql2's UTC-midnight conversion for DATE columns
      // which caused a -5:30 shift for IST, showing Sept 4 as Sept 3.
      dateStrings: true,
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 2000,
    },
    // Convert snake_case from DB to camelCase in JS
    postProcessResponse: (result: any) => {
      if (Array.isArray(result)) {
        return result.map((row) => convertSnakeToCamel(row));
      }
      return convertSnakeToCamel(result);
    },
    wrapIdentifier,
  });

  instance.on('query-error', (err: any, obj: any) => {
    console.error('[KNEX ERROR]', err?.message || err, obj?.sql);
  });

  return instance;
}

/**
 * Recursively convert object keys from snake_case to camelCase
 */
export function convertSnakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertSnakeToCamel(item));
  }

  if (typeof obj !== 'object' || Object.prototype.toString.call(obj) !== '[object Object]') {
    return obj;
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] = convertSnakeToCamel(value);
  }

  return converted;
}

/**
 * Get the Knex instance, initializing if necessary
 */
export function getKnex(): Knex {
  if (!instance) {
    initializeKnex();
  }
  return instance!;
}

/**
 * Close the database connection (for graceful shutdown)
 */
export async function closeKnex(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}

/**
 * Raw column reference for builder queries (avoids camelCase conversion)
 */
export function raw(sql: string, bindings?: unknown[]): Knex.Raw {
  return getKnex().raw(sql, bindings as any);
}

/**
 * Transaction helper
 */
export async function withTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  const dbInstance = getKnex();
  return dbInstance.transaction((trx) => callback(trx));
}

/**
 * Lazy proxy to Knex instance so `import { db } from './knex'` works directly.
 */
export const db = new Proxy(
  function () {} as any,
  {
    get(_target, prop) {
      const instance = getKnex() as any;
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    apply(_target, _thisArg, argArray) {
      return (getKnex() as any)(...argArray);
    },
  }
) as unknown as Knex;
