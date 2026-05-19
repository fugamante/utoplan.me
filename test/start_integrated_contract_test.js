'use strict';

var assert = require('assert');
var integrated = require('../scripts/start_integrated');

var defaults = integrated.buildConfig({});

assert.deepStrictEqual(defaults.api.args, ['--prefix', 'dtoapi', 'run', 'start:modern']);
assert.deepStrictEqual(defaults.app.args, ['--prefix', 'app', 'start']);
assert.strictEqual(defaults.api.env.PORT, '3001');
assert.strictEqual(defaults.app.env.PORT, '8080');
assert.strictEqual(defaults.app.env.UTOPLAN_API_ORIGIN, 'http://127.0.0.1:3001');
assert.strictEqual(defaults.appUrl, 'http://127.0.0.1:8080');
assert.strictEqual(defaults.apiOrigin, 'http://127.0.0.1:3001');

var custom = integrated.buildConfig({
  UTOPLAN_API_PORT: '3101',
  UTOPLAN_APP_PORT: '8181'
});

assert.strictEqual(custom.api.env.PORT, '3101');
assert.strictEqual(custom.app.env.PORT, '8181');
assert.strictEqual(custom.app.env.UTOPLAN_API_ORIGIN, 'http://127.0.0.1:3101');
assert.strictEqual(custom.appUrl, 'http://127.0.0.1:8181');

var explicitOrigin = integrated.buildConfig({
  UTOPLAN_API_PORT: '3101',
  UTOPLAN_API_ORIGIN: 'http://localhost:4000'
});

assert.strictEqual(explicitOrigin.api.env.PORT, '3101');
assert.strictEqual(explicitOrigin.app.env.UTOPLAN_API_ORIGIN, 'http://localhost:4000');
