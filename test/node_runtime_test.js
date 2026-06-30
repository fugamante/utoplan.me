'use strict';

var assert = require('assert');
var path = require('path');
var runtime = require('../scripts/verify_node_runtime');

var rootDir = path.join(__dirname, '..');

assert.strictEqual(runtime.parseMajor('22'), 22);
assert.strictEqual(runtime.parseMajor('v22.3.1'), 22);
assert.strictEqual(runtime.parseMajor('invalid'), null);
assert.strictEqual(runtime.readPinnedMajor(rootDir), 22);
assert.strictEqual(runtime.validateVersion('v22.17.0', 22), null);
assert(runtime.validateVersion('v26.0.0', 22).indexOf('Node 22.x is required') !== -1);
assert.strictEqual(runtime.run({
  rootDir: rootDir,
  currentVersion: 'v22.9.0'
}), 0);

var originalError = console.error;

try {
  console.error = function() {};
  assert.strictEqual(runtime.run({
    rootDir: rootDir,
    currentVersion: 'v24.0.0'
  }), 1);
} finally {
  console.error = originalError;
}
