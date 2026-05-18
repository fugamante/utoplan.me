'use strict';

import {Pool, type PoolConfig, type QueryResult as PgQueryResult} from 'pg';
import type {DatabaseRow} from './resource_contract';

export interface QueryResult {
  rows: DatabaseRow[];
}

export type QueryCallback = (error: Error | null, result: QueryResult) => void;

export type CloseCallback = (error?: Error) => void;

let pool: Pool | null = null;

function value(primary: string | undefined, fallback: string | undefined): string | undefined {
  return primary || fallback;
}

export function connectionConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL
    };
  }

  return {
    host: value(process.env.TEST_DATABASE_HOST, process.env.DATABASE_HOST) || '127.0.0.1',
    port: Number(value(process.env.TEST_DATABASE_PORT, process.env.DATABASE_PORT) || 5432),
    user: value(process.env.TEST_DATABASE_USER, process.env.DATABASE_USER) || 'postgres',
    password: value(process.env.TEST_DATABASE_PASSWORD, process.env.DATABASE_PASSWORD) || '',
    database: value(process.env.TEST_DATABASE_DB, process.env.DATABASE_DB) || 'dtoapi_test'
  };
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(connectionConfig());
  }

  return pool;
}

export function query(text: string, params: unknown[], callback: QueryCallback): void {
  getPool().query(text, params, function(error: Error, result: PgQueryResult<DatabaseRow>) {
    callback(error || null, result);
  });
}

export function close(callback?: CloseCallback): void {
  if (!pool) {
    if (callback) {
      callback();
    }
    return;
  }

  const activePool = pool;
  pool = null;
  if (callback) {
    activePool.end(callback);
    return;
  }

  activePool.end();
}
