'use strict';

import {Pool, type PoolConfig, type QueryResult as PgQueryResult} from 'pg';
import type {DatabaseRow} from './resource_contract';
import * as schemaContract from './schema_contract';

export interface QueryResult {
  rows: DatabaseRow[];
}

export type QueryCallback = (error: Error | null, result: QueryResult) => void;

export type CloseCallback = (error?: Error) => void;

export type ReadyCallback = (error: Error | null, status?: schemaContract.SchemaStatus) => void;

let pool: Pool | null = null;

function value(primary: string | undefined, fallback: string | undefined): string | undefined {
  return primary || fallback;
}

export function handlePoolError(error: Error): void {
  const code = (error as NodeJS.ErrnoException).code;

  if (code === '57P01') {
    console.error('database pool connection terminated during shutdown');
    return;
  }

  console.error(error.stack || error.message);
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

export function hasExplicitConnectionConfig(): boolean {
  if (process.env.DATABASE_URL) {
    return true;
  }

  return Boolean(
    value(process.env.TEST_DATABASE_HOST, process.env.DATABASE_HOST) &&
    value(process.env.TEST_DATABASE_USER, process.env.DATABASE_USER) &&
    value(process.env.TEST_DATABASE_DB, process.env.DATABASE_DB)
  );
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(connectionConfig());
    pool.on('error', handlePoolError);
  }

  return pool;
}

export function query(text: string, params: unknown[], callback: QueryCallback): void {
  getPool().query(text, params, function(error: Error, result: PgQueryResult<DatabaseRow>) {
    callback(error || null, result);
  });
}

export function ready(callback: ReadyCallback): void {
  query(schemaContract.statusQuery(), schemaContract.statusParams(), function(error: Error | null, result: QueryResult) {
    if (error) {
      callback(error);
      return;
    }

    const status = schemaContract.evaluate(result.rows);
    if (!status.ok) {
      callback(new Error('database schema does not match ' + status.version), status);
      return;
    }

    callback(null, status);
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
