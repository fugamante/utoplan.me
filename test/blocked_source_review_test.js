'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var review = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-blocked-source-review.json'), 'utf8'));
var registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json'), 'utf8'));
var schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-schema-map.json'), 'utf8'));
var confidence = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-provenance-confidence.json'), 'utf8'));
var expectedTables = ['businesses', 'cdepts', 'grade_cs'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function schemaByTable() {
  return schema.tables.reduce(function(map, table) {
    map[table.table] = table;
    return map;
  }, {});
}

function blockedByTable() {
  return confidence.blockedTables.reduce(function(map, table) {
    map[table.table] = table;
    return map;
  }, {});
}

assert.strictEqual(review.schemaVersion, 1);
assert.strictEqual(review.scope, 'puerto-rico-only');
assert.strictEqual(review.sourceRegistry, 'data/sources/puerto-rico.json');
assert.strictEqual(review.schemaMapping, 'data/mappings/puerto-rico-schema-map.json');
assert.strictEqual(review.provenanceConfidence, 'data/mappings/puerto-rico-provenance-confidence.json');
assert.strictEqual(review.decision, 'keep-blocked');
assert(Array.isArray(review.reviewedTables));
assert.deepStrictEqual(review.reviewedTables.map(function(item) {
  return item.table;
}).sort(), expectedTables);

var schemaTables = schemaByTable();
var confidenceTables = blockedByTable();

review.reviewedTables.forEach(function(item) {
  assert.strictEqual(item.decision, 'keep-blocked');
  assert(isNonEmptyString(item.legacyNeed), item.table + ' legacyNeed is required');
  assert(isNonEmptyString(item.reason), item.table + ' reason is required');
  assert(Array.isArray(item.candidateFindings), item.table + ' candidateFindings must be an array');
  assert(item.candidateFindings.length > 0, item.table + ' must record reviewed candidates');
  assert(schemaTables[item.table], item.table + ' must exist in schema mapping');
  assert.strictEqual(schemaTables[item.table].status, 'blocked');
  assert.deepStrictEqual(schemaTables[item.table].sourceIds, []);
  assert.strictEqual(schemaTables[item.table].preferredSourceId, null);
  assert(confidenceTables[item.table], item.table + ' must remain blocked in provenance confidence');
  assert.strictEqual(confidenceTables[item.table].sourceBacked, false);

  item.candidateFindings.forEach(function(candidate) {
    assert(isNonEmptyString(candidate.candidateId), item.table + ' candidateId is required');
    assert(/^https:\/\//.test(candidate.url), candidate.candidateId + ' must use an HTTPS URL');
    assert(isNonEmptyString(candidate.fit), candidate.candidateId + ' fit is required');
    assert(isNonEmptyString(candidate.finding), candidate.candidateId + ' finding is required');
  });
});

assert(registry.unresolvedTargets.some(function(target) {
  return target.status === 'blocked' &&
    expectedTables.every(function(table) {
      return target.targetTables.indexOf(table) !== -1;
    });
}), 'registry must keep blocked tables unresolved');
