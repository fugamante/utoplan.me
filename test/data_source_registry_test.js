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

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

var expectedColumnsByTable = {
  cbps: [
    'id',
    'total_indus',
    'total_anual',
    'cnaic',
    'cnaic_name',
    'county',
    'num_est',
    'created_at',
    'updated_at'
  ],
  unis: [
    'id',
    'title',
    'address',
    'desc',
    'lat',
    'long',
    'created_at',
    'updated_at'
  ]
};

function hasActiveMappedTarget(source) {
  return hasTargetTable(source, 'cbps') || hasTargetTable(source, 'unis');
}

assert.strictEqual(registry.schemaVersion, 1);
assert.strictEqual(registry.scope, 'puerto-rico-only');
assert(isIsoDate(registry.retrievedAt), 'registry retrievedAt must be an ISO YYYY-MM-DD date');
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

  if (hasActiveMappedTarget(source)) {
    assert(source.legacySchemaMap && typeof source.legacySchemaMap === 'object', source.id + ' must include legacySchemaMap');
    assert(source.importReadiness && typeof source.importReadiness === 'object', source.id + ' must include importReadiness');
    assert(source.importReadiness.status === 'blocked' || source.importReadiness.status === 'ready', source.id + ' importReadiness.status must be blocked or ready');
    assert(isIsoDate(source.importReadiness.reviewedAt), source.id + ' importReadiness.reviewedAt must be an ISO YYYY-MM-DD date');
    assert(Array.isArray(source.importReadiness.blockers), source.id + ' importReadiness.blockers must be an array');
    if (source.importReadiness.status === 'blocked') {
      assert(source.importReadiness.blockers.length > 0, source.id + ' blocked importReadiness must include blockers');
    }

    assert(isNonEmptyString(source.legacySchemaMap.table), source.id + ' legacySchemaMap.table is required');
    assert(isNonEmptyString(source.legacySchemaMap.evidenceType), source.id + ' legacySchemaMap.evidenceType is required');
    assert(isIsoDate(source.legacySchemaMap.evidenceDate), source.id + ' legacySchemaMap.evidenceDate must be an ISO YYYY-MM-DD date');
    assert(Array.isArray(source.legacySchemaMap.columnCoverage), source.id + ' legacySchemaMap.columnCoverage must be an array');
    assert(source.legacySchemaMap.columnCoverage.length > 0, source.id + ' legacySchemaMap.columnCoverage must not be empty');
    assert(Object.prototype.hasOwnProperty.call(expectedColumnsByTable, source.legacySchemaMap.table), source.id + ' legacySchemaMap.table must be supported');
    assert(hasTargetTable(source, source.legacySchemaMap.table), source.id + ' legacySchemaMap.table must match a target table');

    var expectedColumns = expectedColumnsByTable[source.legacySchemaMap.table];
    var seenColumns = Object.create(null);

    source.legacySchemaMap.columnCoverage.forEach(function(mapping) {
      assert(isNonEmptyString(mapping.legacyColumn), source.id + ' mapping legacyColumn is required');
      assert(Array.isArray(mapping.sourceFields), source.id + ' mapping sourceFields must be an array');
      assert(isCoverageValue(mapping.coverage), source.id + ' mapping coverage must be exact, derived, or missing');
      assert(!seenColumns[mapping.legacyColumn], source.id + ' duplicates mapping for ' + mapping.legacyColumn);
      seenColumns[mapping.legacyColumn] = true;

      if (mapping.coverage === 'exact') {
        assert(mapping.sourceFields.length > 0, source.id + ' exact coverage requires sourceFields');
      }

      if (mapping.coverage === 'derived') {
        assert(mapping.sourceFields.length > 0, source.id + ' derived coverage requires sourceFields');
        assert(isNonEmptyString(mapping.notes), source.id + ' derived coverage requires notes');
      }

      if (mapping.coverage === 'missing') {
        assert.strictEqual(mapping.sourceFields.length, 0, source.id + ' missing coverage must not list sourceFields');
        assert(isNonEmptyString(mapping.notes), source.id + ' missing coverage requires notes');
      }
    });

    assert.deepStrictEqual(
      Object.keys(seenColumns).sort(),
      expectedColumns.slice().sort(),
      source.id + ' must cover every preserved legacy column for ' + source.legacySchemaMap.table
    );

    source.importReadiness.blockers.forEach(function(blocker) {
      assert(isNonEmptyString(blocker.id), source.id + ' blocker id is required');
      assert(
        blocker.kind === 'transform-decision' || blocker.kind === 'source-gap' || blocker.kind === 'operator-dependency',
        source.id + ' blocker kind must be transform-decision, source-gap, or operator-dependency'
      );
      assert(Array.isArray(blocker.legacyColumns), source.id + ' blocker legacyColumns must be an array');
      blocker.legacyColumns.forEach(function(column) {
        assert(expectedColumns.indexOf(column) !== -1, source.id + ' blocker references unknown legacy column ' + column);
      });
      assert(isNonEmptyString(blocker.summary), source.id + ' blocker summary is required');
      assert(isNonEmptyString(blocker.resolutionEvidence), source.id + ' blocker resolutionEvidence is required');
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
