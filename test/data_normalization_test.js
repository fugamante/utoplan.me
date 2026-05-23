'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var sourceRegistry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json'), 'utf8'));
var schemaMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-schema-map.json'), 'utf8'));
var normalization = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-normalization.json'), 'utf8'));
var helpers = require('../scripts/data_normalization');

var allowedStatus = {
  ready: true,
  'needs-review': true,
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

function mappedColumns() {
  return schemaMapping.tables.reduce(function(columns, tableMap) {
    tableMap.columns.forEach(function(column) {
      columns[tableMap.table + '.' + column.target] = true;
    });
    return columns;
  }, {
    '*.created_at': true,
    '*.updated_at': true
  });
}

assert.strictEqual(normalization.schemaVersion, 1);
assert.strictEqual(normalization.scope, 'puerto-rico-only');
assert.strictEqual(normalization.schemaMapping, 'data/mappings/puerto-rico-schema-map.json');
assert(isNonEmptyString(normalization.mappedAt));
assert(Array.isArray(normalization.rules));
assert(normalization.rules.length > 0);

var knownSourceIds = sourceIds();
var knownColumns = mappedColumns();
var seenRules = {};

normalization.rules.forEach(function(rule) {
  assert(isNonEmptyString(rule.id), 'rule id is required');
  assert(!seenRules[rule.id], rule.id + ' must be unique');
  seenRules[rule.id] = true;

  assert(isNonEmptyString(rule.table), rule.id + ' table is required');
  assert(allowedStatus[rule.status], rule.id + ' has invalid status');
  assert(Array.isArray(rule.targetColumns), rule.id + ' targetColumns must be an array');
  assert(rule.targetColumns.length > 0, rule.id + ' must target at least one column');
  assert(Array.isArray(rule.sourceIds), rule.id + ' sourceIds must be an array');
  assert(Array.isArray(rule.sourceColumns), rule.id + ' sourceColumns must be an array');
  assert(isNonEmptyString(rule.policy), rule.id + ' policy is required');
  assert(Array.isArray(rule.steps), rule.id + ' steps must be an array');
  assert(rule.steps.length > 0, rule.id + ' must describe deterministic steps');
  assert.strictEqual(typeof rule.rejectOnFailure, 'boolean', rule.id + ' rejectOnFailure must be boolean');
  assert(isNonEmptyString(rule.notes), rule.id + ' notes are required');

  rule.sourceIds.forEach(function(sourceId) {
    assert(knownSourceIds[sourceId], rule.id + ' references unknown source ' + sourceId);
  });

  rule.targetColumns.forEach(function(column) {
    var key = rule.table + '.' + column;
    assert(knownColumns[key], rule.id + ' references unmapped column ' + key);
  });

  if (rule.status === 'ready') {
    assert(rule.steps.every(isNonEmptyString), rule.id + ' ready rule steps must be non-empty strings');
  }
});

assert(seenRules['cbps-current-schema-naics'], 'NAICS normalization rule is required');
assert(seenRules['muns-county-code'], 'municipality code normalization rule is required');
assert(seenRules['unis-coordinate-join'], 'university coordinate join rule is required');
assert.strictEqual(
  normalization.rules.filter(function(rule) {
    return rule.id === 'unis-coordinate-join';
  })[0].status,
  'needs-review'
);

assert.deepStrictEqual(helpers.normalizeNaics('541'), {
  ok: true,
  reason: null,
  value: 541
});

assert.strictEqual(helpers.normalizeNaics('23----').ok, false);
assert.strictEqual(helpers.normalizeNaics('------').ok, false);

assert.deepStrictEqual(helpers.normalizeCbpCounty({
  fipscty: '001',
  cencty: '999'
}), {
  ok: true,
  reason: null,
  value: 1
});

assert.deepStrictEqual(helpers.normalizeCbpCounty({
  fipscty: '',
  cencty: '003'
}), {
  ok: true,
  reason: null,
  value: 3
});

assert.deepStrictEqual(helpers.normalizeMunCounty({
  countyfp: '',
  cntyidfp: '72013'
}), {
  ok: true,
  reason: null,
  value: 13
});

assert.deepStrictEqual(helpers.normalizeMunTitle('  San   Juan  '), {
  ok: true,
  reason: null,
  value: 'San Juan'
});

assert.strictEqual(helpers.normalizeName('American University of Puerto Rico'), 'american puerto rico');
assert.strictEqual(helpers.normalizeTokenText('BAYAMÓN'), 'bayamon');

var coordinateMatch = helpers.joinUniversityCoordinates({
  'Nombre de la Institución': 'American University of Puerto Rico',
  'Dirección Física': 'Carr # 2 KM 14.0',
  'Dirección Física 2': 'Barrio Hato Tejas',
  Pueblo: 'BAYAMON'
}, [
  {
    NAME: 'American University of Puerto Rico',
    STREET: 'Carr. #2, Km.14.4, Bo. Hato Tejas',
    CITY: 'Bayamon',
    LAT: 18.407058,
    LON: -66.186631
  }
]);

assert.strictEqual(coordinateMatch.ok, true);
assert.deepStrictEqual(coordinateMatch.value, {
  lat: 18.407058,
  long: -66.186631,
  matchScore: 6
});

var ambiguousCoordinateMatch = helpers.joinUniversityCoordinates({
  'Nombre de la Institución': 'Sample College',
  'Dirección Física': 'Main Street',
  'Dirección Física 2': '',
  Pueblo: 'San Juan'
}, [
  {
    NAME: 'Sample College',
    STREET: 'North Campus',
    CITY: 'San Juan',
    LAT: 18,
    LON: -66
  },
  {
    NAME: 'Sample College',
    STREET: 'South Campus',
    CITY: 'San Juan',
    LAT: 18.1,
    LON: -66.1
  }
]);

assert.strictEqual(ambiguousCoordinateMatch.ok, false);
assert.strictEqual(ambiguousCoordinateMatch.status, 'ambiguous');
