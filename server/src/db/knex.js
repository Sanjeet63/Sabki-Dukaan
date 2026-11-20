import knex from 'knex';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export const dbConfig = {
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: here('./migrations'),
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
    stub: here('./migration.stub'),
  },
  seeds: {
    directory: here('./seeds'),
    loadExtensions: ['.js'],
  },
};

export const db = knex(dbConfig);
