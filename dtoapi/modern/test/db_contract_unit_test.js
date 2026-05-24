'use strict';

const assert = require('assert');
const db = require('../lib/db');

const keys = [
  'DATABASE_URL',
  'TEST_DATABASE_HOST',
  'DATABASE_HOST',
  'TEST_DATABASE_PORT',
  'DATABASE_PORT',
  'TEST_DATABASE_USER',
  'DATABASE_USER',
  'TEST_DATABASE_PASSWORD',
  'DATABASE_PASSWORD',
  'TEST_DATABASE_DB',
  'DATABASE_DB'
];

const original = keys.reduce(function(values, key) {
  values[key] = process.env[key];
  delete process.env[key];
  return values;
}, {});

function restore() {
  keys.forEach(function(key) {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  });
}

try {
  assert.deepStrictEqual(db.connectionConfig(), {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'dtoapi_test'
  });
  assert.strictEqual(db.hasExplicitConnectionConfig(), false);

  process.env.DATABASE_HOST = 'fallback-host';
  process.env.TEST_DATABASE_HOST = 'test-host';
  process.env.DATABASE_PORT = '1111';
  process.env.TEST_DATABASE_PORT = '2222';
  process.env.DATABASE_USER = 'fallback-user';
  process.env.TEST_DATABASE_USER = 'test-user';
  process.env.DATABASE_PASSWORD = 'fallback-password';
  process.env.TEST_DATABASE_PASSWORD = 'test-password';
  process.env.DATABASE_DB = 'fallback-db';
  process.env.TEST_DATABASE_DB = 'test-db';

  assert.deepStrictEqual(db.connectionConfig(), {
    host: 'test-host',
    port: 2222,
    user: 'test-user',
    password: 'test-password',
    database: 'test-db'
  });
  assert.strictEqual(db.hasExplicitConnectionConfig(), true);

  process.env.DATABASE_URL = 'postgres://example';
  assert.deepStrictEqual(db.connectionConfig(), {
    connectionString: 'postgres://example'
  });
  assert.strictEqual(db.hasExplicitConnectionConfig(), true);
  assert.strictEqual(typeof db.transaction, 'function');
} finally {
  restore();
}
