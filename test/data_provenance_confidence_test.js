'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var sourceRegistry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json'), 'utf8'));
var schemaMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-schema-map.json'), 'utf8'));
var confidence = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-provenance-confidence.json'), 'utf8'));

var expectedLoadableTables = ['cbps', 'muns', 'unis'];
var expectedBlockedTables = ['businesses', 'cdepts', 'grade_cs'];
var allowedConfidence = {
  high: true,
  medium: true,
  low: true,
  blocked: true
};
var allowedReadiness = {
  'candidate-needs-review': true,
  blocked: true
};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function sourceIds() {
  return sourceRegistry.sources.reduce(function(ids, source) {
    ids[source.id] = true;
    return ids;
  }, {});
}

function tableStatuses() {
  return schemaMapping.tables.reduce(function(statuses, tableMap) {
    statuses[tableMap.table] = tableMap.status;
    return statuses;
  }, {});
}

assert.strictEqual(confidence.schemaVersion, 1);
assert.strictEqual(confidence.scope, 'puerto-rico-only');
assert.strictEqual(confidence.sourceRegistry, 'data/sources/puerto-rico.json');
assert.strictEqual(confidence.schemaMapping, 'data/mappings/puerto-rico-schema-map.json');
assert.strictEqual(confidence.normalizationMapping, 'data/mappings/puerto-rico-normalization.json');
assert.deepStrictEqual(confidence.appliesToTables.slice().sort(), expectedLoadableTables);
assert.deepStrictEqual(confidence.rowProvenanceFields, [
  'sourceId',
  'rowIndex',
  'sourceConfidence',
  'transformConfidence',
  'productionReadiness',
  'sourceBacked',
  'notes'
]);
assert(isNonEmptyString(confidence.promotionRule));

Object.keys(allowedConfidence).forEach(function(level) {
  assert(isNonEmptyString(confidence.confidenceLevels[level]), level + ' confidence definition is required');
});

var knownSourceIds = sourceIds();
var statuses = tableStatuses();
var assessedTables = {};

confidence.tableAssessments.forEach(function(assessment) {
  assert(expectedLoadableTables.indexOf(assessment.table) !== -1, assessment.table + ' must be part of the loadable baseline');
  assert.notStrictEqual(statuses[assessment.table], 'blocked', assessment.table + ' must not be blocked in schema mapping');
  assert(Array.isArray(assessment.sourceIds), assessment.table + ' sourceIds must be an array');
  assert(assessment.sourceIds.length > 0, assessment.table + ' must list source ids');
  assert(knownSourceIds[assessment.preferredSourceId], assessment.table + ' preferred source must be registered');
  assert(assessment.sourceIds.indexOf(assessment.preferredSourceId) !== -1, assessment.table + ' preferred source must be listed');
  assert(allowedConfidence[assessment.sourceConfidence], assessment.table + ' source confidence is invalid');
  assert(allowedConfidence[assessment.transformConfidence], assessment.table + ' transform confidence is invalid');
  assert(allowedReadiness[assessment.productionReadiness], assessment.table + ' readiness is invalid');
  assert.strictEqual(assessment.sourceBacked, true, assessment.table + ' must be source-backed candidate data');
  assert(Array.isArray(assessment.requiredBeforeApiPromotion), assessment.table + ' promotion blockers must be listed');
  assert(assessment.requiredBeforeApiPromotion.length > 0, assessment.table + ' must keep unresolved promotion blockers visible');
  assert(isNonEmptyString(assessment.notes), assessment.table + ' notes are required');

  assessment.sourceIds.forEach(function(sourceId) {
    assert(knownSourceIds[sourceId], assessment.table + ' references unknown source ' + sourceId);
  });

  assessedTables[assessment.table] = true;
});

assert.deepStrictEqual(Object.keys(assessedTables).sort(), expectedLoadableTables);

var blockedTables = {};

confidence.blockedTables.forEach(function(blocked) {
  assert(expectedBlockedTables.indexOf(blocked.table) !== -1, blocked.table + ' must be a blocked legacy table');
  assert.strictEqual(statuses[blocked.table], 'blocked', blocked.table + ' must be blocked in schema mapping');
  assert.strictEqual(blocked.sourceConfidence, 'blocked');
  assert.strictEqual(blocked.transformConfidence, 'blocked');
  assert.strictEqual(blocked.productionReadiness, 'blocked');
  assert.strictEqual(blocked.sourceBacked, false);
  assert(isNonEmptyString(blocked.reason), blocked.table + ' block reason is required');
  blockedTables[blocked.table] = true;
});

assert.deepStrictEqual(Object.keys(blockedTables).sort(), expectedBlockedTables);
