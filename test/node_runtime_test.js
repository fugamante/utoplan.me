'use strict';

var assert = require('assert');
var path = require('path');
var runtime = require('../scripts/verify_node_runtime');

var rootDir = path.join(__dirname, '..');

assert.strictEqual(runtime.parseMajor('26'), 26);
assert.strictEqual(runtime.parseMajor('v26.3.1'), 26);
assert.strictEqual(runtime.parseMajor('invalid'), null);
assert.strictEqual(runtime.readPinnedMajor(rootDir), 26);
assert.strictEqual(runtime.validateVersion('v26.7.0', 26), null);
assert(runtime.validateVersion('v24.0.0', 26).indexOf('Node 26.x is required') !== -1);
assert.strictEqual(runtime.run({
  rootDir: rootDir,
  currentVersion: 'v26.7.0'
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
