'use strict';

const assert = require('assert');
const childProcess = require('child_process');

const env = Object.assign({}, process.env, {
  NODE_ENV: 'production',
  PORT: '18090'
});

[
  'DATABASE_URL',
  'DATABASE_HOST',
  'DATABASE_USER',
  'DATABASE_DB',
  'TEST_DATABASE_HOST',
  'TEST_DATABASE_USER',
  'TEST_DATABASE_DB'
].forEach(function(key) {
  delete env[key];
});

const result = childProcess.spawnSync(process.execPath, ['lib/server.js'], {
  cwd: __dirname + '/..',
  env: env,
  encoding: 'utf8',
  timeout: 5000
});

assert.notStrictEqual(result.status, 0);
assert(result.stderr.indexOf('DATABASE_URL or DATABASE_HOST, DATABASE_USER, and DATABASE_DB are required in production') !== -1);
