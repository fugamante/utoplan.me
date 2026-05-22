'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var releasePreflight = require('../scripts/release_preflight');

var originalError = console.error;

try {
  console.error = function() {};

  assert.strictEqual(releasePreflight.run({
    UTOPLAN_RELEASE_SAMPLE: '1'
  }), 0);

  assert.strictEqual(releasePreflight.run({
    NODE_ENV: 'production',
    UTOPLAN_API_ORIGIN: 'http://api:3001',
    DATABASE_HOST: 'postgres.example.internal',
    DATABASE_USER: 'utoplan',
    DATABASE_DB: 'utoplan'
  }), 0);

  assert.strictEqual(releasePreflight.run({
    NODE_ENV: 'development',
    UTOPLAN_API_ORIGIN: 'ftp://api:3001'
  }), 1);
} finally {
  console.error = originalError;
}

var result = childProcess.spawnSync(process.execPath, ['scripts/release_preflight.js'], {
  cwd: __dirname + '/..',
  env: Object.assign({}, process.env, {
    UTOPLAN_RELEASE_SAMPLE: '1'
  }),
  encoding: 'utf8'
});

assert.strictEqual(result.status, 0);
assert(result.stderr.indexOf('Release preflight verified') !== -1);
