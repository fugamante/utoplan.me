'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var verifier = require('../scripts/verify_deployment_config');

function validEnv() {
  return {
    NODE_ENV: 'production',
    PORT: '3001',
    UTOPLAN_API_ORIGIN: 'http://api:3001',
    DATABASE_HOST: 'postgres.example.internal',
    DATABASE_USER: 'utoplan',
    DATABASE_DB: 'utoplan'
  };
}

assert.deepStrictEqual(verifier.validateConfig(validEnv(), {
  service: 'integrated'
}), []);

assert.deepStrictEqual(verifier.validateConfig({
  NODE_ENV: 'production',
  PORT: '8080',
  UTOPLAN_API_ORIGIN: 'https://api.example.internal'
}, {
  service: 'app'
}), []);

assert.deepStrictEqual(verifier.validateConfig({
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'postgres://utoplan:secret@postgres.example.internal:5432/utoplan'
}, {
  service: 'api'
}), []);

assert.deepStrictEqual(verifier.validateConfig({
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'postgres://utoplan:secret@postgres.example.internal:5432/utoplan',
  UTOPLAN_API_EXPOSURE: 'public',
  UTOPLAN_PUBLIC_API_URL: 'https://api.example.com'
}, {
  service: 'api'
}), []);

var invalid = verifier.validateConfig({
  NODE_ENV: 'development',
  PORT: '70000',
  UTOPLAN_API_ORIGIN: 'ftp://api:3001',
  UTOPLAN_DEMO_FIXTURE: '1'
}, {
  service: 'integrated'
});

assert(invalid.indexOf('UTOPLAN_API_ORIGIN must use http or https') !== -1);
assert(invalid.indexOf('UTOPLAN_DEMO_FIXTURE must be unset in production') !== -1);
assert(invalid.indexOf('NODE_ENV must be production') !== -1);
assert(invalid.indexOf('DATABASE_URL or DATABASE_HOST, DATABASE_USER, and DATABASE_DB are required') !== -1);
assert(invalid.indexOf('PORT must be an integer from 1 to 65535') !== -1);

var invalidPublic = verifier.validateConfig({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://utoplan:secret@postgres.example.internal:5432/utoplan',
  UTOPLAN_API_EXPOSURE: 'public'
}, {
  service: 'api'
});

assert(invalidPublic.indexOf('UTOPLAN_PUBLIC_API_URL is required') !== -1);

var invalidExposure = verifier.validateConfig({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://utoplan:secret@postgres.example.internal:5432/utoplan',
  UTOPLAN_API_EXPOSURE: 'internet'
}, {
  service: 'api'
});

assert(invalidExposure.indexOf('UTOPLAN_API_EXPOSURE must be private or public') !== -1);

var result = childProcess.spawnSync(process.execPath, ['scripts/verify_deployment_config.js'], {
  cwd: __dirname + '/..',
  env: Object.assign({}, process.env, validEnv()),
  encoding: 'utf8'
});

assert.strictEqual(result.status, 0);
assert(result.stderr.indexOf('Deployment configuration verified') !== -1);

var failed = childProcess.spawnSync(process.execPath, ['scripts/verify_deployment_config.js', '--service=api'], {
  cwd: __dirname + '/..',
  env: {
    NODE_ENV: 'production'
  },
  encoding: 'utf8'
});

assert.strictEqual(failed.status, 1);
assert(failed.stderr.indexOf('DATABASE_URL or DATABASE_HOST, DATABASE_USER, and DATABASE_DB are required') !== -1);
