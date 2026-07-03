'use strict';

var assert = require('assert');
var path = require('path');
var runtime = require('../scripts/verify_node_runtime');

var rootDir = path.join(__dirname, '..');

assert.strictEqual(runtime.parseMajor('24'), 24);
assert.strictEqual(runtime.parseMajor('v24.3.1'), 24);
assert.strictEqual(runtime.parseMajor('invalid'), null);
assert.strictEqual(runtime.readPinnedMajor(rootDir), 24);
assert.strictEqual(runtime.validateVersion('v24.18.0', 24), null);
assert(runtime.validateVersion('v26.0.0', 24).indexOf('Node 24.x is required') !== -1);
assert.strictEqual(runtime.run({
  rootDir: rootDir,
  currentVersion: 'v24.9.0'
}), 0);

var originalError = console.error;

try {
  console.error = function() {};
  assert.strictEqual(runtime.run({
    rootDir: rootDir,
    currentVersion: 'v22.0.0'
  }), 1);
} finally {
  console.error = originalError;
}
