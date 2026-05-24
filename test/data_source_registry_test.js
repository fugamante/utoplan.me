'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasPuertoRicoScope(source) {
  if (source.scope === 'puerto-rico') {
    return true;
  }

  return source.scope === 'puerto-rico-filtered' && source.scopeFilter === 'state:72';
}

function hasTargetTable(source, table) {
  return source.targetTables.indexOf(table) !== -1;
}

function isCoverageValue(value) {
  return value === 'exact' || value === 'derived' || value === 'missing';
}

assert.strictEqual(registry.schemaVersion, 1);
assert.strictEqual(registry.scope, 'puerto-rico-only');
assert(isNonEmptyString(registry.retrievedAt));
assert(Array.isArray(registry.sources));
assert(registry.sources.length > 0);

registry.sources.forEach(function(source) {
  assert(isNonEmptyString(source.id), 'source id is required');
  assert(isNonEmptyString(source.status), source.id + ' status is required');
  assert(Array.isArray(source.targetTables), source.id + ' targetTables must be an array');
  assert(source.targetTables.length > 0, source.id + ' must target at least one legacy table');
  assert(isNonEmptyString(source.publisher), source.id + ' publisher is required');
  assert(isNonEmptyString(source.portal), source.id + ' portal is required');
  assert(isNonEmptyString(source.license), source.id + ' license is required');
  assert(isNonEmptyString(source.sourceUrl), source.id + ' sourceUrl is required');
  assert(isNonEmptyString(source.resourceUrl) || isNonEmptyString(source.apiUrl), source.id + ' must include a resourceUrl or apiUrl');
  assert(isNonEmptyString(source.sourceBasis), source.id + ' sourceBasis is required');
  assert(hasPuertoRicoScope(source), source.id + ' must be Puerto Rico-only or filtered with state:72');

  if (hasTargetTable(source, 'cbps') || hasTargetTable(source, 'unis')) {
    assert(source.legacySchemaMap && typeof source.legacySchemaMap === 'object', source.id + ' must include legacySchemaMap');
    assert(isNonEmptyString(source.legacySchemaMap.table), source.id + ' legacySchemaMap.table is required');
    assert(isNonEmptyString(source.legacySchemaMap.evidenceDate), source.id + ' legacySchemaMap.evidenceDate is required');
    assert(Array.isArray(source.legacySchemaMap.columnCoverage), source.id + ' legacySchemaMap.columnCoverage must be an array');
    assert(source.legacySchemaMap.columnCoverage.length > 0, source.id + ' legacySchemaMap.columnCoverage must not be empty');

    source.legacySchemaMap.columnCoverage.forEach(function(mapping) {
      assert(isNonEmptyString(mapping.legacyColumn), source.id + ' mapping legacyColumn is required');
      assert(Array.isArray(mapping.sourceFields), source.id + ' mapping sourceFields must be an array');
      assert(isCoverageValue(mapping.coverage), source.id + ' mapping coverage must be exact, derived, or missing');

      if (mapping.coverage === 'missing') {
        assert(isNonEmptyString(mapping.notes), source.id + ' missing coverage requires notes');
      }
    });
  }
});

assert(Array.isArray(registry.unresolvedTargets));
registry.unresolvedTargets.forEach(function(target) {
  assert.strictEqual(target.status, 'blocked');
  assert(Array.isArray(target.targetTables));
  assert(target.targetTables.length > 0);
  assert(isNonEmptyString(target.reason));
});
