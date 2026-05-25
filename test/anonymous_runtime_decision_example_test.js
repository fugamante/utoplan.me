'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var validator = require('../scripts/anonymous_runtime_decision_validate');

var root = path.join(__dirname, '..');
var fixtureDir = path.join(root, 'data', 'fixtures', 'non-production', 'anonymous-runtime-decision-example');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'anonymous-runtime-production-decision-contract.json'), 'utf8'));
var readme = fs.readFileSync(path.join(fixtureDir, 'README.md'), 'utf8');
var manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'manifest.json'), 'utf8'));
var decision = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'runtime-decision.json'), 'utf8'));
var expectedValidation = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'decision-validation.json'), 'utf8'));
var result = validator.validateDecision(decision, contract);

assert.strictEqual(manifest.scope, 'anonymous-runtime-production');
assert.strictEqual(manifest.exampleOnly, true);
assert.strictEqual(manifest.productionApproval, false);
assert.strictEqual(manifest.activationAllowed, false);
assert(manifest.notes.join(' ').indexOf('must not be used as operator approval') !== -1);
assert.deepStrictEqual(manifest.artifacts, [
  'README.md',
  'runtime-decision.json',
  'decision-validation.json'
]);
assert(readme.indexOf('non-production fixture') !== -1);
assert(readme.indexOf('activationAllowed`: `false`') !== -1);
assert.deepStrictEqual(expectedValidation, {
  schemaVersion: 1,
  scope: 'anonymous-runtime-production',
  activationAllowed: false,
  status: 'complete',
  blockedReasons: []
});

assert.strictEqual(decision.targetEnvironment, 'example-non-production');
assert.strictEqual(decision.decisionStatus, 'blocked');
assert.strictEqual(decision.decisionBy.indexOf('@'), -1);
assert.strictEqual(result.status, 'complete');
assert.strictEqual(result.activationAllowed, false);
assert.deepStrictEqual(result.blockedReasons, []);
assert.deepStrictEqual(result, expectedValidation);

[
  'secret',
  'DATABASE_URL',
  'csrfToken',
  'clientIp',
  'rawEnv'
].forEach(function(fragment) {
  assert.strictEqual(readme.indexOf(fragment), -1);
  assert.strictEqual(JSON.stringify(manifest).indexOf(fragment), -1);
  assert.strictEqual(JSON.stringify(decision).indexOf(fragment), -1);
  assert.strictEqual(JSON.stringify(expectedValidation).indexOf(fragment), -1);
});
