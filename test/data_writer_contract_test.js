'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-writer-contract.json'), 'utf8'));
var requiredDependencies = [
  'data/mappings/puerto-rico-load-policy.json',
  'scripts/data_load_plan.js',
  'scripts/data_sql_preview.js',
  'scripts/data_writer_gate.js',
  'db/migrations/202605230900_add_load_natural_key_indexes.md'
];
var requiredInputs = {};
var phases = {};
var auditEvents = {};

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'puerto-rico-only');
assert.strictEqual(contract.contractStatus, 'draft-no-writer');
assert.strictEqual(contract.mutationStatus, 'disabled');

requiredDependencies.forEach(function(dependency) {
  assert(contract.dependsOn.indexOf(dependency) !== -1, dependency + ' should be listed');
});

contract.requiredInputs.forEach(function(input) {
  requiredInputs[input.name] = input;
});

[
  'loadPlan',
  'sqlPreview',
  'writerGate',
  'operatorApproval'
].forEach(function(name) {
  assert(requiredInputs[name], name + ' input should be required');
  assert.strictEqual(requiredInputs[name].required, true);
});

assert.deepStrictEqual(requiredInputs.writerGate.requiredFields, {
  writerEnabled: false,
  writerEnablementAllowed: true
});

[
  'approvedBy',
  'approvedAt',
  'approvalReason',
  'skippedAcknowledged'
].forEach(function(field) {
  assert(requiredInputs.operatorApproval.requiredFields.indexOf(field) !== -1);
});

contract.executionPhases.forEach(function(phase) {
  phases[phase.name] = phase;
});

[
  'preflight',
  'transaction',
  'postCommit'
].forEach(function(name) {
  assert(phases[name], name + ' phase should be defined');
  assert.strictEqual(phases[name].required, true);
  assert(phases[name].checks.length >= 3, name + ' phase should include checks');
});

assert(phases.transaction.checks.some(function(check) {
  return check.indexOf('Open exactly one database transaction') !== -1;
}));
assert(phases.transaction.checks.some(function(check) {
  return check.indexOf('Rollback on first write') !== -1;
}));
assert(phases.transaction.checks.some(function(check) {
  return check.indexOf('Commit only after') !== -1;
}));

contract.auditEvents.forEach(function(eventName) {
  auditEvents[eventName] = true;
});

[
  'writer.preflight.started',
  'writer.preflight.blocked',
  'writer.transaction.opened',
  'writer.statement.executed',
  'writer.transaction.rolled_back',
  'writer.transaction.committed',
  'writer.post_commit.verified'
].forEach(function(eventName) {
  assert(auditEvents[eventName], eventName + ' audit event should be defined');
});

[
  'Do not write rejected records.',
  'Do not write manual-review records.',
  'Do not write unsupported cached sources.',
  'Do not truncate production tables.',
  'Do not change table schema.',
  'Do not execute SQL that is absent from the reviewed SQL preview.',
  'Do not continue after a failed statement.',
  'Do not enable this writer while mutationStatus is disabled.'
].forEach(function(action) {
  assert(contract.forbiddenActions.indexOf(action) !== -1, action + ' should be forbidden');
});

assert.deepStrictEqual(contract.failurePolicy, {
  rollbackOnAnyFailure: true,
  emitAuditEvent: 'writer.transaction.rolled_back',
  operatorActionRequired: true
});
