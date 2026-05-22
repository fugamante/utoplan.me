'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var sourceRegistry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json'), 'utf8'));
var mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-schema-map.json'), 'utf8'));

var expectedColumns = {
  businesses: ['id', 'cdepts_id', 'lat', 'long', 'title', 'address', 'created_at', 'updated_at'],
  cbps: ['id', 'total_indus', 'total_anual', 'cnaic', 'cnaic_name', 'county', 'num_est', 'created_at', 'updated_at'],
  cdepts: ['id', 'cnaic', 'created_at', 'updated_at'],
  grade_cs: ['id', 'uni_id', 'cdepts_id', 'rate', 'year', 'created_at', 'updated_at'],
  muns: ['id', 'title', 'county', 'created_at', 'updated_at'],
  unis: ['id', 'title', 'address', 'desc', 'lat', 'long', 'created_at', 'updated_at']
};

var allowedTableStatus = {
  partial: true,
  blocked: true,
  ready: true
};

var allowedStrategy = {
  blocked: true,
  candidate: true,
  concat: true,
  derived: true,
  direct: true,
  generated: true,
  normalized: true
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

assert.strictEqual(mapping.schemaVersion, 1);
assert.strictEqual(mapping.scope, 'puerto-rico-only');
assert.strictEqual(mapping.sourceRegistry, 'data/sources/puerto-rico.json');
assert(isNonEmptyString(mapping.mappedAt));
assert(Array.isArray(mapping.tables));

var knownSourceIds = sourceIds();
var seenTables = {};

mapping.tables.forEach(function(tableMap) {
  assert(expectedColumns[tableMap.table], tableMap.table + ' must be a preserved legacy table');
  assert(allowedTableStatus[tableMap.status], tableMap.table + ' has invalid status');
  assert(Array.isArray(tableMap.sourceIds), tableMap.table + ' sourceIds must be an array');
  assert(isNonEmptyString(tableMap.notes), tableMap.table + ' notes are required');
  seenTables[tableMap.table] = true;

  tableMap.sourceIds.forEach(function(sourceId) {
    assert(knownSourceIds[sourceId], tableMap.table + ' references unknown source ' + sourceId);
  });

  if (tableMap.preferredSourceId !== null) {
    assert(knownSourceIds[tableMap.preferredSourceId], tableMap.table + ' preferred source is unknown');
    assert(tableMap.sourceIds.indexOf(tableMap.preferredSourceId) !== -1, tableMap.table + ' preferred source must be listed in sourceIds');
  }

  assert(Array.isArray(tableMap.columns), tableMap.table + ' columns must be an array');
  assert.deepStrictEqual(tableMap.columns.map(function(column) {
    return column.target;
  }), expectedColumns[tableMap.table], tableMap.table + ' columns must match the preserved legacy order');

  tableMap.columns.forEach(function(column) {
    assert(allowedStrategy[column.strategy], tableMap.table + '.' + column.target + ' has invalid strategy');
    assert(Array.isArray(column.sourceColumns), tableMap.table + '.' + column.target + ' sourceColumns must be an array');

    if (column.strategy !== 'generated' && column.strategy !== 'blocked') {
      assert(column.sourceColumns.length > 0, tableMap.table + '.' + column.target + ' needs source columns');
    }
  });
});

assert.deepStrictEqual(Object.keys(seenTables).sort(), Object.keys(expectedColumns).sort());
