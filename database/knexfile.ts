import type { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file from database directory, server directory, or root directory
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });
dotenv.config({ path: '../server/.env' });

const config: Record<string, Knex.Config> = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4',
    } as any,
    migrations: {
      extension: 'ts',
      directory: './migrations',
    },
    seeds: {
      extension: 'ts',
      directory: './seeds',
    },
  },
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms_test',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4',
    } as any,
    migrations: {
      extension: 'ts',
      directory: './migrations',
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4',
    } as any,
    migrations: {
      extension: 'ts',
      directory: './migrations',
    },
  },
};

export default config;
