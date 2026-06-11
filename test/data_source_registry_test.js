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

function findColumnCoverage(map, column) {
  return map.columnCoverage.find(function(entry) {
    return entry.legacyColumn === column;
  });
}

function findSourceById(sourceId) {
  return registry.sources.find(function(entry) {
    return entry.id === sourceId;
  });
}

function resolveRepoPath(relativePath) {
  return path.join(__dirname, '..', relativePath);
}

function validateUnisGeocodingPolicy(source) {
  assert(source.geocodingPolicy && typeof source.geocodingPolicy === 'object', source.id + ' must include geocodingPolicy');
  assert.strictEqual(source.geocodingPolicy.status, 'approved', source.id + ' geocodingPolicy.status must be approved');
  assert(isNonEmptyString(source.geocodingPolicy.providerName), source.id + ' geocodingPolicy.providerName is required');
  assert.strictEqual(source.geocodingPolicy.providerType, 'external-geocoder', source.id + ' geocodingPolicy.providerType must be external-geocoder');
  assert(isNonEmptyString(source.geocodingPolicy.policyDocPath), source.id + ' geocodingPolicy.policyDocPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.cacheArtifactPath), source.id + ' geocodingPolicy.cacheArtifactPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.quarantineArtifactPath), source.id + ' geocodingPolicy.quarantineArtifactPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.matchReviewPolicyDocPath), source.id + ' geocodingPolicy.matchReviewPolicyDocPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.matchReviewArtifactPath), source.id + ' geocodingPolicy.matchReviewArtifactPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.servicePath), source.id + ' geocodingPolicy.servicePath is required');
  assert(isNonEmptyString(source.geocodingPolicy.benchmark), source.id + ' geocodingPolicy.benchmark is required');
  assert(isNonEmptyString(source.geocodingPolicy.vintage), source.id + ' geocodingPolicy.vintage is required');
  assert(Array.isArray(source.geocodingPolicy.addressFields), source.id + ' geocodingPolicy.addressFields must be an array');
  assert(source.geocodingPolicy.addressFields.length > 0, source.id + ' geocodingPolicy.addressFields must not be empty');
  assert(isNonEmptyString(source.geocodingPolicy.addressSuffix), source.id + ' geocodingPolicy.addressSuffix is required');
  assert(source.geocodingPolicy.coordinateFields && typeof source.geocodingPolicy.coordinateFields === 'object', source.id + ' geocodingPolicy.coordinateFields are required');
  assert.strictEqual(source.geocodingPolicy.coordinateFields.lat, 'y', source.id + ' geocodingPolicy.coordinateFields.lat must be y');
  assert.strictEqual(source.geocodingPolicy.coordinateFields.long, 'x', source.id + ' geocodingPolicy.coordinateFields.long must be x');
  assert(isNonEmptyString(source.geocodingPolicy.scopeGuard), source.id + ' geocodingPolicy.scopeGuard is required');
  assert(isNonEmptyString(source.geocodingPolicy.reviewRule), source.id + ' geocodingPolicy.reviewRule is required');
  assert(isNonEmptyString(source.geocodingPolicy.quarantineRule), source.id + ' geocodingPolicy.quarantineRule is required');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.policyDocPath)), source.id + ' geocodingPolicy.policyDocPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.cacheArtifactPath)), source.id + ' geocodingPolicy.cacheArtifactPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.quarantineArtifactPath)), source.id + ' geocodingPolicy.quarantineArtifactPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.matchReviewPolicyDocPath)), source.id + ' geocodingPolicy.matchReviewPolicyDocPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.matchReviewArtifactPath)), source.id + ' geocodingPolicy.matchReviewArtifactPath must exist in the repository');

  var geocodingCache = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.cacheArtifactPath), 'utf8'));
  assert.strictEqual(geocodingCache.schemaVersion, 1, source.id + ' geocoding cache schemaVersion must be 1');
  assert(Array.isArray(geocodingCache.records), source.id + ' geocoding cache records must be an array');

  var quarantineArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.quarantineArtifactPath), 'utf8'));
  assert.strictEqual(quarantineArtifact.schemaVersion, 1, source.id + ' quarantine artifact schemaVersion must be 1');
  assert.strictEqual(quarantineArtifact.sourceId, source.id, source.id + ' quarantine artifact sourceId must match the source id');
  assert(quarantineArtifact.generatedAt === null || isIsoDate(quarantineArtifact.generatedAt), source.id + ' quarantine artifact generatedAt must be null or ISO YYYY-MM-DD');
  assert(Array.isArray(quarantineArtifact.records), source.id + ' quarantine artifact records must be an array');
  assert(
    quarantineArtifact.status === 'pending-reviewed-cache' || quarantineArtifact.status === 'reviewed',
    source.id + ' quarantine artifact status must be pending-reviewed-cache or reviewed'
  );

  var matchReviewArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.matchReviewArtifactPath), 'utf8'));
  assert.strictEqual(matchReviewArtifact.schemaVersion, 1, source.id + ' match review artifact schemaVersion must be 1');
  assert.strictEqual(matchReviewArtifact.sourceId, source.id, source.id + ' match review artifact sourceId must match the source id');
  assert(isNonEmptyString(matchReviewArtifact.auxiliarySourceId), source.id + ' match review artifact auxiliarySourceId is required');
  assert.strictEqual(matchReviewArtifact.policyDocPath, source.geocodingPolicy.matchReviewPolicyDocPath, source.id + ' match review artifact policyDocPath must match geocodingPolicy.matchReviewPolicyDocPath');
  assert(
    matchReviewArtifact.status === 'pending-review' || matchReviewArtifact.status === 'reviewed',
    source.id + ' match review artifact status must be pending-review or reviewed'
  );
  assert(matchReviewArtifact.reviewedAt === null || isIsoDate(matchReviewArtifact.reviewedAt), source.id + ' match review artifact reviewedAt must be null or ISO YYYY-MM-DD');
  assert(Array.isArray(matchReviewArtifact.approvedMatches), source.id + ' match review artifact approvedMatches must be an array');
  assert(Array.isArray(matchReviewArtifact.quarantinedRows), source.id + ' match review artifact quarantinedRows must be an array');

  matchReviewArtifact.approvedMatches.forEach(function(record) {
    assert(isNonEmptyString(record.directoryInstitution), source.id + ' approved match directoryInstitution is required');
    assert(isNonEmptyString(record.directoryMunicipality), source.id + ' approved match directoryMunicipality is required');
    assert(isNonEmptyString(record.directoryAddress), source.id + ' approved match directoryAddress is required');
    assert(isNonEmptyString(record.auxiliaryInstitution), source.id + ' approved match auxiliaryInstitution is required');
    assert(isNonEmptyString(record.auxiliaryMunicipality), source.id + ' approved match auxiliaryMunicipality is required');
    assert(isNonEmptyString(record.auxiliaryUnitid), source.id + ' approved match auxiliaryUnitid is required');
    assert(record.decisionType === 'approved-alias' || record.decisionType === 'approved-campus', source.id + ' approved match decisionType must be approved-alias or approved-campus');
    assert(isNonEmptyString(record.evidenceSummary), source.id + ' approved match evidenceSummary is required');
    assert(isNonEmptyString(record.reviewer), source.id + ' approved match reviewer is required');
    assert(isIsoDate(record.reviewedAt), source.id + ' approved match reviewedAt must be ISO YYYY-MM-DD');
  });

  matchReviewArtifact.quarantinedRows.forEach(function(record) {
    assert(isNonEmptyString(record.directoryInstitution), source.id + ' quarantined row directoryInstitution is required');
    assert(isNonEmptyString(record.directoryMunicipality), source.id + ' quarantined row directoryMunicipality is required');
    assert(isNonEmptyString(record.directoryAddress), source.id + ' quarantined row directoryAddress is required');
    assert(isNonEmptyString(record.quarantineReason), source.id + ' quarantined row quarantineReason is required');
    assert(isNonEmptyString(record.reviewer), source.id + ' quarantined row reviewer is required');
    assert(isIsoDate(record.reviewedAt), source.id + ' quarantined row reviewedAt must be ISO YYYY-MM-DD');
  });

  quarantineArtifact.records.forEach(function(record) {
    assert.strictEqual(record.sourceId, source.id, source.id + ' quarantine record sourceId must match');
    assert(isNonEmptyString(record.directoryInstitution), source.id + ' quarantine record directoryInstitution is required');
    assert(isNonEmptyString(record.directoryMunicipality), source.id + ' quarantine record directoryMunicipality is required');
    assert(isNonEmptyString(record.normalizedAddress), source.id + ' quarantine record normalizedAddress is required');
    assert(isNonEmptyString(record.exclusionReason), source.id + ' quarantine record exclusionReason is required');
    assert.strictEqual(record.reviewStatus, 'reviewed', source.id + ' quarantine record reviewStatus must be reviewed');
    assert(isIsoDate(record.reviewedAt), source.id + ' quarantine record reviewedAt must be ISO YYYY-MM-DD');
  });

  if (matchReviewArtifact.status === 'reviewed') {
    assert(isIsoDate(matchReviewArtifact.reviewedAt), source.id + ' reviewed match review artifact must include reviewedAt');
    assert(matchReviewArtifact.approvedMatches.length + matchReviewArtifact.quarantinedRows.length > 0, source.id + ' reviewed match review artifact must include decisions');
    assert.strictEqual(quarantineArtifact.status, 'reviewed', source.id + ' reviewed match review artifact requires a reviewed quarantine artifact');
    assert.strictEqual(quarantineArtifact.records.length, matchReviewArtifact.quarantinedRows.length, source.id + ' quarantine artifact must mirror reviewed quarantined row count');
  }

  if (source.importReadiness.status === 'ready') {
    assert(geocodingCache.records.length > 0, source.id + ' importReadiness cannot be ready while the reviewed geocoding cache is empty');
    assert.strictEqual(quarantineArtifact.status, 'reviewed', source.id + ' ready importReadiness requires a reviewed quarantine artifact');
    assert.strictEqual(matchReviewArtifact.status, 'reviewed', source.id + ' ready importReadiness requires a reviewed match review artifact');
  }
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
    if (source.legacySchemaMap.columnStrategies !== undefined) {
      assert(Array.isArray(source.legacySchemaMap.columnStrategies), source.id + ' legacySchemaMap.columnStrategies must be an array when present');
    }
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

    if (source.legacySchemaMap.table === 'cbps' && findColumnCoverage(source.legacySchemaMap, 'cnaic_name').coverage === 'missing') {
      assert(Array.isArray(source.legacySchemaMap.columnStrategies), source.id + ' must include columnStrategies when cbps cnaic_name is not present in the source');

      var cnaicNameStrategies = source.legacySchemaMap.columnStrategies.filter(function(strategy) {
        return strategy.legacyColumn === 'cnaic_name';
      });

      assert.strictEqual(cnaicNameStrategies.length, 1, source.id + ' must include exactly one cnaic_name column strategy');

      var strategy = cnaicNameStrategies[0];
      assert.strictEqual(strategy.status, 'approved', source.id + ' cnaic_name strategy must be approved');
      assert.strictEqual(strategy.kind, 'auxiliary-source-join', source.id + ' cnaic_name strategy must use auxiliary-source-join');
      assert(isNonEmptyString(strategy.sourceId), source.id + ' cnaic_name strategy sourceId is required');
      assert(isNonEmptyString(strategy.sourceField), source.id + ' cnaic_name strategy sourceField is required');
      assert(strategy.joinKey && typeof strategy.joinKey === 'object', source.id + ' cnaic_name strategy joinKey is required');
      assert(isNonEmptyString(strategy.joinKey.sourceField), source.id + ' cnaic_name strategy joinKey.sourceField is required');
      assert(isNonEmptyString(strategy.joinKey.referenceField), source.id + ' cnaic_name strategy joinKey.referenceField is required');
      assert(isNonEmptyString(strategy.joinKey.normalizer), source.id + ' cnaic_name strategy joinKey.normalizer is required');
      assert(isNonEmptyString(strategy.localArtifactPath), source.id + ' cnaic_name strategy localArtifactPath is required');
      assert(isNonEmptyString(strategy.notes), source.id + ' cnaic_name strategy notes are required');
      assert(fs.existsSync(resolveRepoPath(strategy.localArtifactPath)), source.id + ' cnaic_name strategy localArtifactPath must exist in the repository');

      var referenceSource = findSourceById(strategy.sourceId);
      assert(referenceSource, source.id + ' cnaic_name strategy sourceId must reference a registered source');
      assert(hasTargetTable(referenceSource, 'cbps'), source.id + ' cnaic_name strategy sourceId must target cbps');

      var referenceCnaicCoverage = findColumnCoverage(referenceSource.legacySchemaMap, 'cnaic_name');
      var referenceCodeCoverage = findColumnCoverage(referenceSource.legacySchemaMap, 'cnaic');

      assert(referenceCnaicCoverage, source.id + ' cnaic_name strategy sourceId must document cnaic_name coverage');
      assert(referenceCodeCoverage, source.id + ' cnaic_name strategy sourceId must document cnaic coverage');
      assert(referenceCnaicCoverage.coverage === 'exact', source.id + ' cnaic_name strategy sourceId must expose exact cnaic_name coverage');
      assert(referenceCnaicCoverage.sourceFields.indexOf(strategy.sourceField) !== -1, source.id + ' cnaic_name strategy sourceField must exist on the reference source');
      assert(referenceCodeCoverage.sourceFields.indexOf(strategy.joinKey.referenceField) !== -1, source.id + ' cnaic_name strategy joinKey.referenceField must exist on the reference source');
      assert(findColumnCoverage(source.legacySchemaMap, 'cnaic').sourceFields.indexOf(strategy.joinKey.sourceField) !== -1, source.id + ' cnaic_name strategy joinKey.sourceField must exist on the primary source');
    }

    if (source.legacySchemaMap.table === 'unis') {
      validateUnisGeocodingPolicy(source);

      if (source.geocodingPolicy.matchReviewArtifactPath) {
        var auditArtifact = JSON.parse(fs.readFileSync(resolveRepoPath('data/unis/ipeds-geocode-audit.json'), 'utf8'));
        var matchReviewArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.matchReviewArtifactPath), 'utf8'));
        if (matchReviewArtifact.status === 'reviewed') {
          assert.strictEqual(
            matchReviewArtifact.approvedMatches.length + matchReviewArtifact.quarantinedRows.length,
            auditArtifact.summary.unmatchedCount,
            source.id + ' reviewed alias/campus decisions must cover every unmatched audit row'
          );
        }
      }

      ['lat', 'long'].forEach(function(column) {
        var coverage = findColumnCoverage(source.legacySchemaMap, column);
        assert.strictEqual(coverage.coverage, 'derived', source.id + ' ' + column + ' coverage must be derived after geocoding-policy approval');
      });

      assert(Array.isArray(source.legacySchemaMap.columnStrategies), source.id + ' must include columnStrategies for geocoded unis coordinates');

      var geocodeStrategies = source.legacySchemaMap.columnStrategies.filter(function(strategy) {
        return strategy.legacyColumn === 'lat' || strategy.legacyColumn === 'long';
      });

      assert.strictEqual(geocodeStrategies.length, 2, source.id + ' must include exactly two geocode column strategies');

      geocodeStrategies.forEach(function(strategy) {
        assert.strictEqual(strategy.status, 'approved', source.id + ' geocode strategy must be approved');
        assert.strictEqual(strategy.kind, 'geocode-from-address', source.id + ' geocode strategy kind must be geocode-from-address');
        assert(isNonEmptyString(strategy.sourceField), source.id + ' geocode strategy sourceField is required');
        assert(strategy.joinKey && typeof strategy.joinKey === 'object', source.id + ' geocode strategy joinKey is required');
        assert(Array.isArray(strategy.joinKey.sourceFields), source.id + ' geocode strategy joinKey.sourceFields must be an array');
        assert(strategy.joinKey.sourceFields.length > 0, source.id + ' geocode strategy joinKey.sourceFields must not be empty');
        assert(isNonEmptyString(strategy.joinKey.normalizer), source.id + ' geocode strategy joinKey.normalizer is required');
        assert(isNonEmptyString(strategy.localArtifactPath), source.id + ' geocode strategy localArtifactPath is required');
        assert(fs.existsSync(resolveRepoPath(strategy.localArtifactPath)), source.id + ' geocode strategy localArtifactPath must exist in the repository');
        assert.strictEqual(strategy.localArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' geocode strategy localArtifactPath must match geocodingPolicy cacheArtifactPath');
        assert(isNonEmptyString(strategy.notes), source.id + ' geocode strategy notes are required');
      });
    }

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
