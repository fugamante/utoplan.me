'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-load-policy.json'), 'utf8'));
var loadPlan = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json'), 'utf8'));
var loadableTables = ['cbps', 'muns', 'unis'];
var seenTables = {};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

assert.strictEqual(policy.schemaVersion, 1);
assert.strictEqual(policy.scope, 'puerto-rico-only');
assert.strictEqual(policy.writerStatus, 'not-implemented');
assert.strictEqual(policy.requiresOperatorApproval, true);
assert.strictEqual(policy.transaction.mode, 'single-transaction');
assert(Array.isArray(policy.transaction.steps));
assert(policy.transaction.steps.length >= 4);
assert.strictEqual(policy.idempotency.mode, 'upsert-by-natural-key');
assert(Array.isArray(policy.idempotency.tables));

policy.idempotency.tables.forEach(function(tablePolicy) {
  assert(loadableTables.indexOf(tablePolicy.table) !== -1, tablePolicy.table + ' is not loadable from the dry-run boundary');
  assert(Array.isArray(tablePolicy.naturalKey), tablePolicy.table + ' naturalKey must be an array');
  assert(tablePolicy.naturalKey.length > 0, tablePolicy.table + ' naturalKey is required');
  assert(Array.isArray(tablePolicy.updateColumns), tablePolicy.table + ' updateColumns must be an array');
  assert(tablePolicy.updateColumns.indexOf('updated_at') !== -1, tablePolicy.table + ' must update updated_at');
  assert(isNonEmptyString(tablePolicy.notes), tablePolicy.table + ' notes are required');
  seenTables[tablePolicy.table] = true;
});

assert.deepStrictEqual(Object.keys(seenTables).sort(), loadableTables.sort());
assert(Array.isArray(policy.writeGuards));
assert(policy.writeGuards.indexOf('Never write rejected records.') !== -1);
assert(policy.writeGuards.indexOf('Never write manual-review records.') !== -1);
assert(policy.writeGuards.indexOf('Never truncate production tables from this loader.') !== -1);

loadPlan.accepted.forEach(function(item) {
  assert(seenTables[item.table], item.table + ' accepted row needs an idempotency policy');
});
