'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var runner = require('../scripts/run_signal_reviews');

var root = path.join(__dirname, '..');
var packageContract = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
var registry = JSON.parse(fs.readFileSync(
  path.join(root, 'data/profile-reach/decision-signal-registry-v1.json'),
  'utf8'
));
var plan = runner.buildPlan({
  root: root,
  packageContract: packageContract,
  registry: registry
});
var focusedScripts = Object.keys(packageContract.scripts).filter(function(scriptName) {
  return /^test:.*-signal-review$/.test(scriptName);
}).sort();

assert.deepStrictEqual(
  plan,
  ['test:signal-review-orchestration', 'test:decision-signals'].concat(focusedScripts),
  'aggregate plan must be stable and sorted'
);

var missingScriptPackage = JSON.parse(JSON.stringify(packageContract));
delete missingScriptPackage.scripts[focusedScripts[0]];
assert.throws(function() {
  runner.buildPlan({root: root, packageContract: missingScriptPackage, registry: registry});
}, /reviewed artifact has no focused test/);

var missingArtifactRegistry = JSON.parse(JSON.stringify(registry));
missingArtifactRegistry.signals[0].artifactPaths = (missingArtifactRegistry.signals[0].artifactPaths || []).concat([
  'data/profile-reach/aguada-restaurant-missing-review.json'
]);
assert.throws(function() {
  runner.buildPlan({root: root, packageContract: packageContract, registry: missingArtifactRegistry});
}, /reviewed artifact is missing/);
