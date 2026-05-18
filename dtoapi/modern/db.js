'use strict';

const {Pool} = require('pg');

let pool;

function value(primary, fallback) {
  return primary || fallback;
}

function connectionConfig() {
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

function getPool() {
  if (!pool) {
    pool = new Pool(connectionConfig());
  }

  return pool;
}

function query(text, params, callback) {
  getPool().query(text, params, callback);
}

function close(callback) {
  if (!pool) {
    return callback && callback();
  }

  const activePool = pool;
  pool = null;
  activePool.end(callback);
}

module.exports = {
  query: query,
  close: close,
  connectionConfig: connectionConfig
};
