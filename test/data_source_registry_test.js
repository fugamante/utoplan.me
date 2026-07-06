'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
var unisGeocodingPolicy = fs.readFileSync(path.join(__dirname, '..', 'docs', 'unis-geocoding-policy.md'), 'utf8');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasPuertoRicoScope(source) {
  if (source.scope === 'puerto-rico') {
    return true;
  }

  return (
    source.scope === 'puerto-rico-filtered' &&
    (
      source.scopeFilter === 'state:72' ||
      source.scopeFilter === 'state:PR' ||
      source.scopeFilter === 'state:Puerto Rico'
    )
  );
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
  assert(isNonEmptyString(source.geocodingPolicy.importBoundaryArtifactPath), source.id + ' geocodingPolicy.importBoundaryArtifactPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.addressReviewArtifactPath), source.id + ' geocodingPolicy.addressReviewArtifactPath is required');
  assert(isNonEmptyString(source.geocodingPolicy.addressVerificationArtifactPath), source.id + ' geocodingPolicy.addressVerificationArtifactPath is required');
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
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.importBoundaryArtifactPath)), source.id + ' geocodingPolicy.importBoundaryArtifactPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.addressReviewArtifactPath)), source.id + ' geocodingPolicy.addressReviewArtifactPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.addressVerificationArtifactPath)), source.id + ' geocodingPolicy.addressVerificationArtifactPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.matchReviewPolicyDocPath)), source.id + ' geocodingPolicy.matchReviewPolicyDocPath must exist in the repository');
  assert(fs.existsSync(resolveRepoPath(source.geocodingPolicy.matchReviewArtifactPath)), source.id + ' geocodingPolicy.matchReviewArtifactPath must exist in the repository');

  var geocodingCache = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.cacheArtifactPath), 'utf8'));
  assert.strictEqual(geocodingCache.schemaVersion, 1, source.id + ' geocoding cache schemaVersion must be 1');
  assert(Array.isArray(geocodingCache.records), source.id + ' geocoding cache records must be an array');
  assert.strictEqual(geocodingCache.sourceId, source.id, source.id + ' geocoding cache sourceId must match the source id');
  assert.strictEqual(geocodingCache.provider, source.geocodingPolicy.providerName, source.id + ' geocoding cache provider must match geocodingPolicy.providerName');
  assert.strictEqual(geocodingCache.benchmark, source.geocodingPolicy.benchmark, source.id + ' geocoding cache benchmark must match geocodingPolicy.benchmark');
  assert.strictEqual(geocodingCache.vintage, source.geocodingPolicy.vintage, source.id + ' geocoding cache vintage must match geocodingPolicy.vintage');
  assert(isNonEmptyString(geocodingCache.buildCommand), source.id + ' geocoding cache buildCommand is required');
  assert.strictEqual(geocodingCache.policyDocPath, source.geocodingPolicy.policyDocPath, source.id + ' geocoding cache policyDocPath must match geocodingPolicy.policyDocPath');
  assert.strictEqual(geocodingCache.matchReviewArtifactPath, source.geocodingPolicy.matchReviewArtifactPath, source.id + ' geocoding cache matchReviewArtifactPath must match geocodingPolicy.matchReviewArtifactPath');
  assert.strictEqual(geocodingCache.addressReviewArtifactPath, source.geocodingPolicy.addressReviewArtifactPath, source.id + ' geocoding cache addressReviewArtifactPath must match geocodingPolicy.addressReviewArtifactPath');
  assert(geocodingCache.generatedAt === null || isIsoDate(geocodingCache.generatedAt), source.id + ' geocoding cache generatedAt must be null or ISO YYYY-MM-DD');

  var quarantineArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.quarantineArtifactPath), 'utf8'));
  assert.strictEqual(quarantineArtifact.schemaVersion, 1, source.id + ' quarantine artifact schemaVersion must be 1');
  assert.strictEqual(quarantineArtifact.sourceId, source.id, source.id + ' quarantine artifact sourceId must match the source id');
  assert(quarantineArtifact.generatedAt === null || isIsoDate(quarantineArtifact.generatedAt), source.id + ' quarantine artifact generatedAt must be null or ISO YYYY-MM-DD');
  assert(Array.isArray(quarantineArtifact.records), source.id + ' quarantine artifact records must be an array');
  assert.strictEqual(quarantineArtifact.addressReviewArtifactPath, source.geocodingPolicy.addressReviewArtifactPath, source.id + ' quarantine artifact addressReviewArtifactPath must match geocodingPolicy.addressReviewArtifactPath');
  assert(
    quarantineArtifact.status === 'pending-reviewed-cache' || quarantineArtifact.status === 'reviewed',
    source.id + ' quarantine artifact status must be pending-reviewed-cache or reviewed'
  );

  var importBoundaryArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.importBoundaryArtifactPath), 'utf8'));
  validateUnisImportBoundary(source, geocodingCache, quarantineArtifact, importBoundaryArtifact);

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

  var addressReviewArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.addressReviewArtifactPath), 'utf8'));
  validateUnisAddressReview(source, geocodingCache, quarantineArtifact, matchReviewArtifact, addressReviewArtifact);
  var addressVerificationArtifact = JSON.parse(fs.readFileSync(resolveRepoPath(source.geocodingPolicy.addressVerificationArtifactPath), 'utf8'));
  validateUnisAddressVerification(source, geocodingCache, quarantineArtifact, addressReviewArtifact, addressVerificationArtifact);

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
    validateReviewedGeocodeCoverage(source, geocodingCache, quarantineArtifact, matchReviewArtifact);
    validateUnisImportBoundaryCounts(source, geocodingCache, quarantineArtifact, importBoundaryArtifact, matchReviewArtifact);
  }

  if (source.importReadiness.status === 'ready') {
    assert(geocodingCache.records.length > 0, source.id + ' importReadiness cannot be ready while the reviewed geocoding cache is empty');
    assert.strictEqual(quarantineArtifact.status, 'reviewed', source.id + ' ready importReadiness requires a reviewed quarantine artifact');
    assert.strictEqual(matchReviewArtifact.status, 'reviewed', source.id + ' ready importReadiness requires a reviewed match review artifact');
  }
}

function validateUnisImportBoundary(source, geocodingCache, quarantineArtifact, importBoundaryArtifact) {
  assert.strictEqual(importBoundaryArtifact.schemaVersion, 1, source.id + ' import boundary schemaVersion must be 1');
  assert.strictEqual(importBoundaryArtifact.sourceId, source.id, source.id + ' import boundary sourceId must match');
  assert(isIsoDate(importBoundaryArtifact.reviewedAt), source.id + ' import boundary reviewedAt must be ISO YYYY-MM-DD');
  assert.strictEqual(importBoundaryArtifact.productBoundary, 'descriptive-only', source.id + ' import boundary must preserve descriptive-only scope');
  assert(
    importBoundaryArtifact.status === 'blocked' || importBoundaryArtifact.status === 'accepted',
    source.id + ' import boundary status must be blocked or accepted'
  );
  assert(isNonEmptyString(importBoundaryArtifact.decision), source.id + ' import boundary decision is required');
  assert(isNonEmptyString(importBoundaryArtifact.decisionSummary), source.id + ' import boundary decisionSummary is required');
  assert(importBoundaryArtifact.evidenceArtifacts && typeof importBoundaryArtifact.evidenceArtifacts === 'object', source.id + ' import boundary evidenceArtifacts are required');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.cacheArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' import boundary cache path must match geocodingPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.quarantineArtifactPath, source.geocodingPolicy.quarantineArtifactPath, source.id + ' import boundary quarantine path must match geocodingPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.addressReviewArtifactPath, source.geocodingPolicy.addressReviewArtifactPath, source.id + ' import boundary address review path must match geocodingPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.addressVerificationArtifactPath, source.geocodingPolicy.addressVerificationArtifactPath, source.id + ' import boundary address verification path must match geocodingPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.matchReviewArtifactPath, source.geocodingPolicy.matchReviewArtifactPath, source.id + ' import boundary match review path must match geocodingPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.identityReviewArtifactPath, source.identityAuthorityPolicy.reviewArtifactPath, source.id + ' import boundary identity review path must match identityAuthorityPolicy');
  assert.strictEqual(importBoundaryArtifact.evidenceArtifacts.policyDocPath, source.geocodingPolicy.policyDocPath, source.id + ' import boundary policy path must match geocodingPolicy');
  assert(Array.isArray(importBoundaryArtifact.authoritySources), source.id + ' import boundary authoritySources must be an array');
  assert(Array.isArray(importBoundaryArtifact.workBoard), source.id + ' import boundary workBoard must be an array');
  assert(Array.isArray(importBoundaryArtifact.invariants), source.id + ' import boundary invariants must be an array');
  assert(Array.isArray(importBoundaryArtifact.requiredBeforeReady), source.id + ' import boundary requiredBeforeReady must be an array');
  assert(importBoundaryArtifact.requiredBeforeReady.length > 0, source.id + ' import boundary requiredBeforeReady must not be empty');

  [
    'partial-cache-import-boundary',
    'source-backed-legacy-detail-fields',
    'corrected-address-evidence',
    'identity-quarantine-review',
    'contract-hardening'
  ].forEach(function(boardId) {
    var entry = importBoundaryArtifact.workBoard.find(function(item) {
      return item.id === boardId;
    });
    assert(entry, source.id + ' import boundary workBoard missing ' + boardId);
    assert(isNonEmptyString(entry.candidate), source.id + ' import boundary workBoard candidate is required for ' + boardId);
    assert(isNonEmptyString(entry.evidence), source.id + ' import boundary workBoard evidence is required for ' + boardId);
    assert(isNonEmptyString(entry.impact), source.id + ' import boundary workBoard impact is required for ' + boardId);
    assert(isNonEmptyString(entry.risk), source.id + ' import boundary workBoard risk is required for ' + boardId);
    assert(isNonEmptyString(entry.decision), source.id + ' import boundary workBoard decision is required for ' + boardId);
    assert(isNonEmptyString(entry.status), source.id + ' import boundary workBoard status is required for ' + boardId);
  });

  if (geocodingCache.records.length < geocodingCache.summary.approvedMatchCount && importBoundaryArtifact.status === 'blocked') {
    var blocker = source.importReadiness.blockers.find(function(entry) {
      return entry.id === 'partial-unis-import-boundary-decision-required';
    });
    assert(blocker, source.id + ' partial cache requires a partial import boundary blocker');
    assert.strictEqual(source.importReadiness.status, 'blocked', source.id + ' partial cache boundary requires blocked importReadiness');
    assert.strictEqual(importBoundaryArtifact.status, 'blocked', source.id + ' partial cache boundary must remain blocked until a reviewed decision is accepted');
    assert.strictEqual(importBoundaryArtifact.decision, 'defer-partial-import', source.id + ' partial cache boundary decision must defer partial import');
  }

  if (importBoundaryArtifact.status === 'accepted') {
    assert.strictEqual(quarantineArtifact.status, 'reviewed', source.id + ' accepted import boundary requires reviewed quarantine');
    assert.strictEqual(source.importReadiness.status, 'partial', source.id + ' accepted partial boundary must use partial importReadiness status until full coverage is ready');
    assert.strictEqual(importBoundaryArtifact.decision, 'accept-partial-import', source.id + ' accepted import boundary decision must accept partial import');
    validateAcceptedUnisPartialBoundary(source, geocodingCache, quarantineArtifact, importBoundaryArtifact);
  }
}

function validateAcceptedUnisPartialBoundary(source, geocodingCache, quarantineArtifact, importBoundaryArtifact) {
  var boundary = importBoundaryArtifact.acceptedBoundary;
  assert(boundary && typeof boundary === 'object', source.id + ' accepted import boundary must include acceptedBoundary');
  assert.strictEqual(boundary.coverage, 'partial', source.id + ' acceptedBoundary.coverage must be partial');
  assert.strictEqual(boundary.includedRows, geocodingCache.records.length, source.id + ' acceptedBoundary includedRows must match cache record count');
  assert.strictEqual(boundary.excludedRows, quarantineArtifact.records.length, source.id + ' acceptedBoundary excludedRows must match quarantine record count');
  assert(isNonEmptyString(boundary.coverageLabel), source.id + ' acceptedBoundary coverageLabel is required');
  assert(isNonEmptyString(boundary.apiCoverageLanguage), source.id + ' acceptedBoundary apiCoverageLanguage is required');
  assert(isNonEmptyString(boundary.uiCoverageLanguage), source.id + ' acceptedBoundary uiCoverageLanguage is required');
  assert(isNonEmptyString(boundary.exclusionLanguage), source.id + ' acceptedBoundary exclusionLanguage is required');
  assert(isNonEmptyString(boundary.allowedOutputRule), source.id + ' acceptedBoundary allowedOutputRule is required');
  assert(isNonEmptyString(boundary.blockedOutputRule), source.id + ' acceptedBoundary blockedOutputRule is required');
  assert(isNonEmptyString(boundary.sourceFieldRule), source.id + ' acceptedBoundary sourceFieldRule is required');
  assert.strictEqual(boundary.sourceFieldsArtifactPath, 'data/unis/partial-source-fields.json', source.id + ' acceptedBoundary sourceFieldsArtifactPath must identify reviewed source fields');
  assert.strictEqual(boundary.generatedArtifactPath, 'data/generated/unis-partial-import.json', source.id + ' acceptedBoundary generatedArtifactPath must identify the generated partial import');
  assert.strictEqual(boundary.generatedSeedPath, 'docker/postgres/002_unis_partial_seed.sql', source.id + ' acceptedBoundary generatedSeedPath must identify the generated SQL seed');
  assert.strictEqual(boundary.buildCommand, 'node scripts/build_unis_slice.js', source.id + ' acceptedBoundary buildCommand mismatch');
  assert(fs.existsSync(resolveRepoPath(boundary.sourceFieldsArtifactPath)), source.id + ' acceptedBoundary source fields artifact must exist');
  assert(fs.existsSync(resolveRepoPath(boundary.generatedArtifactPath)), source.id + ' acceptedBoundary generated artifact must exist');
  assert(fs.existsSync(resolveRepoPath(boundary.generatedSeedPath)), source.id + ' acceptedBoundary generated seed must exist');
  assert(
    boundary.apiCoverageLanguage.indexOf('not complete Puerto Rico higher-education coverage') !== -1,
    source.id + ' acceptedBoundary apiCoverageLanguage must state incomplete coverage'
  );
  assert(
    boundary.uiCoverageLanguage.indexOf('partial reviewed source coverage') !== -1,
    source.id + ' acceptedBoundary uiCoverageLanguage must state partial source coverage'
  );

  assert(source.importReadiness.coverage && typeof source.importReadiness.coverage === 'object', source.id + ' partial importReadiness requires coverage');
  assert.strictEqual(source.importReadiness.coverage.status, 'partial', source.id + ' importReadiness coverage status must be partial');
  assert.strictEqual(source.importReadiness.coverage.includedRows, boundary.includedRows, source.id + ' importReadiness includedRows must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.excludedRows, boundary.excludedRows, source.id + ' importReadiness excludedRows must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.importBoundaryArtifactPath, source.geocodingPolicy.importBoundaryArtifactPath, source.id + ' importReadiness coverage boundary path must match geocodingPolicy');
  assert.strictEqual(source.importReadiness.coverage.sourceFieldsArtifactPath, boundary.sourceFieldsArtifactPath, source.id + ' importReadiness sourceFieldsArtifactPath must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.descCoverage, 'source-backed-for-included-rows-only', source.id + ' importReadiness descCoverage must be scoped to included rows');
  assert.strictEqual(source.importReadiness.coverage.generatedArtifactPath, boundary.generatedArtifactPath, source.id + ' importReadiness generatedArtifactPath must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.generatedSeedPath, boundary.generatedSeedPath, source.id + ' importReadiness generatedSeedPath must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.buildCommand, boundary.buildCommand, source.id + ' importReadiness buildCommand must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.apiCoverageLanguage, boundary.apiCoverageLanguage, source.id + ' importReadiness apiCoverageLanguage must match accepted boundary');
  assert.strictEqual(source.importReadiness.coverage.uiCoverageLanguage, boundary.uiCoverageLanguage, source.id + ' importReadiness uiCoverageLanguage must match accepted boundary');

  var sourceFields = JSON.parse(fs.readFileSync(resolveRepoPath(boundary.sourceFieldsArtifactPath), 'utf8'));
  var cacheKeys = geocodingCache.records.reduce(function(index, record) {
    index[
      record.directoryInstitution + '|' +
      record.directoryMunicipality + '|' +
      record.directoryAddress
    ] = true;
    return index;
  }, {});
  var quarantineNames = quarantineArtifact.records.reduce(function(index, record) {
    index[record.directoryInstitution] = true;
    return index;
  }, {});

  assert.strictEqual(sourceFields.schemaVersion, 1, source.id + ' source fields schemaVersion must be 1');
  assert.strictEqual(sourceFields.sourceId, source.id, source.id + ' source fields sourceId must match');
  assert.strictEqual(sourceFields.importBoundaryArtifactPath, source.geocodingPolicy.importBoundaryArtifactPath, source.id + ' source fields boundary path must match geocodingPolicy');
  assert.strictEqual(sourceFields.cacheArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' source fields cache path must match geocodingPolicy');
  assert.strictEqual(sourceFields.includedRows, geocodingCache.records.length, source.id + ' source fields includedRows must match cache count');
  assert.strictEqual(sourceFields.records.length, geocodingCache.records.length, source.id + ' source fields records must cover accepted cache rows');
  sourceFields.records.forEach(function(record) {
    var key = record.directoryInstitution + '|' + record.directoryMunicipality + '|' + record.directoryAddress;
    assert(cacheKeys[key], source.id + ' source fields record must match accepted cache row: ' + record.directoryInstitution);
    assert(!quarantineNames[record.directoryInstitution], source.id + ' source fields must exclude quarantined row: ' + record.directoryInstitution);
  });
  assert.strictEqual(
    source.importReadiness.blockers.some(function(blocker) {
      return blocker.id === 'partial-unis-import-boundary-decision-required';
    }),
    false,
    source.id + ' accepted partial boundary must resolve the partial-boundary decision blocker'
  );
}

function validateUnisAddressReview(source, geocodingCache, quarantineArtifact, matchReviewArtifact, addressReviewArtifact) {
  var approvedByInstitution = Object.create(null);
  var cacheByInstitution = Object.create(null);
  var quarantineByInstitution = Object.create(null);

  assert.strictEqual(addressReviewArtifact.schemaVersion, 1, source.id + ' address review schemaVersion must be 1');
  assert.strictEqual(addressReviewArtifact.sourceId, source.id, source.id + ' address review sourceId must match');
  assert.strictEqual(addressReviewArtifact.matchReviewArtifactPath, source.geocodingPolicy.matchReviewArtifactPath, source.id + ' address review matchReviewArtifactPath must match geocodingPolicy');
  assert.strictEqual(addressReviewArtifact.benchmark, source.geocodingPolicy.benchmark, source.id + ' address review benchmark must match geocodingPolicy');
  assert.strictEqual(addressReviewArtifact.vintage, source.geocodingPolicy.vintage, source.id + ' address review vintage must match geocodingPolicy');
  assert.strictEqual(addressReviewArtifact.status, 'reviewed', source.id + ' address review status must be reviewed');
  assert(isIsoDate(addressReviewArtifact.reviewedAt), source.id + ' address review reviewedAt must be ISO YYYY-MM-DD');
  assert(Array.isArray(addressReviewArtifact.records), source.id + ' address review records must be an array');
  assert.strictEqual(addressReviewArtifact.records.length, 16, source.id + ' address review must cover the 16 approved geocoder-quarantined rows from this MAX pass');
  assert.strictEqual(addressReviewArtifact.summary.activeRowsReviewedCount, 13, source.id + ' address review activeRowsReviewedCount must match the current reviewed board');
  assert.strictEqual(addressReviewArtifact.summary.inactiveOrUnverifiedRowsReviewedCount, 3, source.id + ' address review inactiveOrUnverifiedRowsReviewedCount must match the current reviewed board');

  matchReviewArtifact.approvedMatches.forEach(function(record) {
    approvedByInstitution[record.directoryInstitution] = true;
  });
  geocodingCache.records.forEach(function(record) {
    cacheByInstitution[record.directoryInstitution] = record;
  });
  quarantineArtifact.records.forEach(function(record) {
    quarantineByInstitution[record.directoryInstitution] = record;
  });

  addressReviewArtifact.records.forEach(function(record) {
    assert(approvedByInstitution[record.directoryInstitution], source.id + ' address review record must reference an approved match: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.rowCandidate), source.id + ' address review rowCandidate is required');
    assert(isNonEmptyString(record.currentNormalizedAddress), source.id + ' address review currentNormalizedAddress is required');
    assert(Object.prototype.hasOwnProperty.call(record, 'currentReviewedAddress'), source.id + ' address review currentReviewedAddress is required: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.newOfficialEvidenceFound), source.id + ' address review newOfficialEvidenceFound is required: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.activeLocationStatus), source.id + ' address review activeLocationStatus is required: ' + record.directoryInstitution);
    assert(Array.isArray(record.publicEvidenceFound), source.id + ' address review publicEvidenceFound must be an array');
    assert(isNonEmptyString(record.identityConfidence), source.id + ' address review identityConfidence is required');
    assert(isNonEmptyString(record.addressConfidence), source.id + ' address review addressConfidence is required');
    assert(record.censusResult && typeof record.censusResult === 'object', source.id + ' address review censusResult is required');
    assert(isNonEmptyString(record.decision), source.id + ' address review decision is required');
    assert.strictEqual(record.status, 'reviewed', source.id + ' address review record status must be reviewed');

    if (record.useForGeocoder) {
      assert(isNonEmptyString(record.reviewedAddress), source.id + ' useForGeocoder rows must include reviewedAddress: ' + record.directoryInstitution);
      assert(isNonEmptyString(record.candidateAddressTested), source.id + ' useForGeocoder rows must include candidateAddressTested: ' + record.directoryInstitution);
      if (record.decision === 'promote-reviewed-cache') {
        assert(cacheByInstitution[record.directoryInstitution], source.id + ' promoted address review row must exist in cache: ' + record.directoryInstitution);
        assert.strictEqual(cacheByInstitution[record.directoryInstitution].normalizedAddress, record.reviewedAddress, source.id + ' promoted cache row must use reviewedAddress');
      } else {
        assert(quarantineByInstitution[record.directoryInstitution], source.id + ' non-promoted address review row must remain quarantined: ' + record.directoryInstitution);
        assert.strictEqual(quarantineByInstitution[record.directoryInstitution].normalizedAddress, record.reviewedAddress, source.id + ' quarantined row must use reviewedAddress when rerun');
      }
    }

    if (!record.useForGeocoder) {
      assert(record.reviewedAddress === null, source.id + ' non-rerun address review row must keep reviewedAddress null: ' + record.directoryInstitution);
      assert(record.candidateAddressTested === null, source.id + ' non-rerun address review row must keep candidateAddressTested null: ' + record.directoryInstitution);
      assert(quarantineByInstitution[record.directoryInstitution], source.id + ' non-rerun address review row must remain quarantined: ' + record.directoryInstitution);
    }
  });
}

function validateUnisAddressVerification(source, geocodingCache, quarantineArtifact, addressReviewArtifact, addressVerificationArtifact) {
  var promotedByInstitution = Object.create(null);
  var verificationByInstitution = Object.create(null);
  var geocoderQuarantineByInstitution = Object.create(null);

  assert.strictEqual(addressVerificationArtifact.schemaVersion, 1, source.id + ' address verification schemaVersion must be 1');
  assert.strictEqual(addressVerificationArtifact.sourceId, source.id, source.id + ' address verification sourceId must match');
  assert(isIsoDate(addressVerificationArtifact.generatedAt), source.id + ' address verification generatedAt must be ISO YYYY-MM-DD');
  assert.strictEqual(addressVerificationArtifact.buildCommand, 'node scripts/verify_unis_addresses.js', source.id + ' address verification buildCommand mismatch');
  assert.strictEqual(addressVerificationArtifact.addressReviewArtifactPath, source.geocodingPolicy.addressReviewArtifactPath, source.id + ' address verification review path must match geocodingPolicy');
  assert.strictEqual(addressVerificationArtifact.cacheArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' address verification cache path must match geocodingPolicy');
  assert.strictEqual(addressVerificationArtifact.quarantineArtifactPath, source.geocodingPolicy.quarantineArtifactPath, source.id + ' address verification quarantine path must match geocodingPolicy');
  assert.strictEqual(addressVerificationArtifact.benchmark, geocodingCache.benchmark, source.id + ' address verification benchmark must match cache');
  assert.strictEqual(addressVerificationArtifact.vintage, geocodingCache.vintage, source.id + ' address verification vintage must match cache');
  assert.strictEqual(addressVerificationArtifact.decision, 'retain-remaining-geocoder-quarantine', source.id + ' address verification decision must retain quarantine');
  assert(Array.isArray(addressVerificationArtifact.records), source.id + ' address verification records must be an array');
  assert.strictEqual(addressVerificationArtifact.summary.reviewedNonPromotedRows, 15, source.id + ' address verification must cover 15 non-promoted rows');
  assert.strictEqual(addressVerificationArtifact.summary.geocoderAttemptRows, 13, source.id + ' address verification geocoderAttemptRows must remain 13');
  assert.strictEqual(addressVerificationArtifact.summary.notRerunRows, 2, source.id + ' address verification notRerunRows must remain 2');
  assert.strictEqual(addressVerificationArtifact.summary.puertoRicoMatchNotPromotedRows, 1, source.id + ' address verification must record the one non-promoted Puerto Rico match');
  assert.strictEqual(addressVerificationArtifact.summary.promotionEligibleRows, 0, source.id + ' address verification must not expose promotion-eligible rows');
  assert.strictEqual(addressVerificationArtifact.records.length, addressVerificationArtifact.summary.reviewedNonPromotedRows, source.id + ' address verification record count must match summary');

  geocodingCache.records.forEach(function(record) {
    promotedByInstitution[record.directoryInstitution] = true;
  });
  quarantineArtifact.records.forEach(function(record) {
    if (record.exclusionReason.indexOf('No reviewed Puerto Rico Census geocoder match') !== -1) {
      geocoderQuarantineByInstitution[record.directoryInstitution] = true;
    }
  });

  addressVerificationArtifact.records.forEach(function(record) {
    assert(!promotedByInstitution[record.directoryInstitution], source.id + ' address verification must not include promoted row: ' + record.directoryInstitution);
    assert(geocoderQuarantineByInstitution[record.directoryInstitution], source.id + ' address verification row must remain geocoder-quarantined: ' + record.directoryInstitution);
    assert.strictEqual(record.promotionEligible, false, source.id + ' address verification row must not be promotion eligible: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.promotionBlocker), source.id + ' address verification row must include promotionBlocker: ' + record.directoryInstitution);
    assert.strictEqual(typeof record.puertoRicoMatch, 'boolean', source.id + ' address verification puertoRicoMatch must be boolean: ' + record.directoryInstitution);
    assert(record.matchCount >= 0, source.id + ' address verification matchCount must be non-negative: ' + record.directoryInstitution);
    if (record.useForGeocoder) {
      assert(isNonEmptyString(record.attemptedAddress), source.id + ' geocoder verification attemptedAddress is required: ' + record.directoryInstitution);
    } else {
      assert.strictEqual(record.attemptedAddress, null, source.id + ' non-rerun verification attemptedAddress must be null: ' + record.directoryInstitution);
    }
    verificationByInstitution[record.directoryInstitution] = record;
  });

  addressReviewArtifact.records.forEach(function(record) {
    if (record.decision !== 'promote-reviewed-cache') {
      assert(verificationByInstitution[record.directoryInstitution], source.id + ' address verification missing non-promoted review row: ' + record.directoryInstitution);
    }
  });

  assert(verificationByInstitution['Columbia Central University'], source.id + ' Columbia verification is required');
  assert.strictEqual(verificationByInstitution['Columbia Central University'].puertoRicoMatch, true, source.id + ' Columbia must record the non-promoted Puerto Rico match');
  assert.strictEqual(
    verificationByInstitution['Columbia Central University'].promotionBlocker,
    'matched-address-conflicts-with-reviewed-public-address',
    source.id + ' Columbia match must stay blocked by reviewed-address conflict'
  );
}

function validateUnisImportBoundaryCounts(source, geocodingCache, quarantineArtifact, importBoundaryArtifact, matchReviewArtifact) {
  var counts = importBoundaryArtifact.currentCounts;
  assert(counts && typeof counts === 'object', source.id + ' import boundary currentCounts are required');
  assert.strictEqual(counts.reviewedAliasCampusApprovedRows, matchReviewArtifact.approvedMatches.length, source.id + ' import boundary approved count must match match review');
  assert.strictEqual(counts.reviewedCensusCacheRows, geocodingCache.records.length, source.id + ' import boundary cache count must match cache records');
  assert.strictEqual(counts.geocoderQuarantinedApprovedRows, geocodingCache.summary.geocoderQuarantineCount, source.id + ' import boundary geocoder quarantine count must match cache summary');
  assert.strictEqual(counts.identityQuarantinedRows, matchReviewArtifact.quarantinedRows.length, source.id + ' import boundary identity quarantine count must match match review');
  assert.strictEqual(counts.reviewedRowsAccountedFor, matchReviewArtifact.approvedMatches.length + matchReviewArtifact.quarantinedRows.length, source.id + ' import boundary accounted count must match reviewed decisions');
  assert.strictEqual(quarantineArtifact.records.length, counts.geocoderQuarantinedApprovedRows + counts.identityQuarantinedRows, source.id + ' import boundary counts must account for quarantine records');
}

function validateReviewedGeocodeCoverage(source, geocodingCache, quarantineArtifact, matchReviewArtifact) {
  var approvedByInstitution = Object.create(null);
  var cacheByInstitution = Object.create(null);
  var geocoderQuarantineByInstitution = Object.create(null);

  matchReviewArtifact.approvedMatches.forEach(function(record) {
    approvedByInstitution[record.directoryInstitution] = record;
  });

  assert(geocodingCache.summary && typeof geocodingCache.summary === 'object', source.id + ' geocoding cache summary is required');
  assert.strictEqual(
    geocodingCache.summary.approvedMatchCount,
    matchReviewArtifact.approvedMatches.length,
    source.id + ' geocoding cache approvedMatchCount must match approved matches'
  );
  assert.strictEqual(
    geocodingCache.summary.reviewedCacheRecordCount,
    geocodingCache.records.length,
    source.id + ' geocoding cache reviewedCacheRecordCount must match records'
  );

  geocodingCache.records.forEach(function(record) {
    assert(approvedByInstitution[record.directoryInstitution], source.id + ' geocoding cache record must reference an approved match: ' + record.directoryInstitution);
    assert.strictEqual(record.sourceId, source.id, source.id + ' geocoding cache record sourceId must match');
    assert(isNonEmptyString(record.normalizedAddress), source.id + ' geocoding cache record normalizedAddress is required');
    assert(isNonEmptyString(record.matchedAddress), source.id + ' geocoding cache record matchedAddress is required');
    assert.strictEqual(record.benchmark, geocodingCache.benchmark, source.id + ' geocoding cache record benchmark must match cache benchmark');
    assert.strictEqual(record.vintage, geocodingCache.vintage, source.id + ' geocoding cache record vintage must match cache vintage');
    assert.strictEqual(record.puertoRicoStateGEOID, '72', source.id + ' geocoding cache record must resolve to Puerto Rico');
    assert.strictEqual(record.reviewStatus, 'reviewed', source.id + ' geocoding cache record reviewStatus must be reviewed');
    assert(isIsoDate(record.reviewedAt), source.id + ' geocoding cache record reviewedAt must be ISO YYYY-MM-DD');
    assert.strictEqual(typeof record.latitude, 'number', source.id + ' geocoding cache record latitude must be numeric');
    assert.strictEqual(typeof record.longitude, 'number', source.id + ' geocoding cache record longitude must be numeric');
    cacheByInstitution[record.directoryInstitution] = true;
  });

  quarantineArtifact.records.forEach(function(record) {
    if (approvedByInstitution[record.directoryInstitution] && !cacheByInstitution[record.directoryInstitution]) {
      assert(
        record.exclusionReason.indexOf('No reviewed Puerto Rico Census geocoder match') !== -1,
        source.id + ' approved uncached row must have a geocoder quarantine reason: ' + record.directoryInstitution
      );
      geocoderQuarantineByInstitution[record.directoryInstitution] = true;
    }
  });

  matchReviewArtifact.approvedMatches.forEach(function(record) {
    assert(
      cacheByInstitution[record.directoryInstitution] || geocoderQuarantineByInstitution[record.directoryInstitution],
      source.id + ' approved match must be cached or geocoder-quarantined: ' + record.directoryInstitution
    );
  });

  assert.strictEqual(
    geocodingCache.records.length + Object.keys(geocoderQuarantineByInstitution).length,
    matchReviewArtifact.approvedMatches.length,
    source.id + ' approved matches must be fully partitioned between cache and geocoder quarantine'
  );
  assert.strictEqual(
    geocodingCache.summary.geocoderQuarantineCount,
    Object.keys(geocoderQuarantineByInstitution).length,
    source.id + ' geocoding cache geocoderQuarantineCount must match quarantine records'
  );
  assert.strictEqual(
    quarantineArtifact.records.length,
    matchReviewArtifact.quarantinedRows.length + Object.keys(geocoderQuarantineByInstitution).length,
    source.id + ' quarantine artifact must include identity-quarantined rows plus approved geocoder failures'
  );
}

function validateUnisAuthorityStack(source) {
  var strongerAuthorityBlocker = source.importReadiness.blockers.find(function(blocker) {
    return blocker.id === 'stronger-unis-identity-authority-required';
  });

  if (!strongerAuthorityBlocker) {
    return;
  }

  assert(source.identityAuthorityPolicy && typeof source.identityAuthorityPolicy === 'object', source.id + ' stronger authority blocker requires identityAuthorityPolicy');
  assert.strictEqual(source.identityAuthorityPolicy.status, 'reviewed-excluded', source.id + ' identityAuthorityPolicy status must keep rows excluded');
  assert.strictEqual(source.identityAuthorityPolicy.reviewArtifactPath, 'data/unis/identity-review.json', source.id + ' identity review artifact path mismatch');
  assert.strictEqual(source.identityAuthorityPolicy.followupReviewArtifactPath, 'data/unis/corroborated-identity-followup-review.json', source.id + ' identity follow-up artifact path mismatch');
  assert.strictEqual(source.identityAuthorityPolicy.albizuStagedReviewArtifactPath, 'data/unis/albizu-staged-review.json', source.id + ' Albizu staged review artifact path mismatch');
  assert.strictEqual(source.identityAuthorityPolicy.sagradoStagedReviewArtifactPath, 'data/unis/sagrado-staged-review.json', source.id + ' Sagrado staged review artifact path mismatch');
  assert.strictEqual(source.identityAuthorityPolicy.sagradoGeocoderCandidateReviewArtifactPath, 'data/geocoding/sagrado-geocoder-candidate-review.json', source.id + ' Sagrado geocoder candidate review artifact path mismatch');
  assert.strictEqual(source.identityAuthorityPolicy.matchReviewArtifactPath, source.geocodingPolicy.matchReviewArtifactPath, source.id + ' identity policy match review path must match geocodingPolicy');
  assert.strictEqual(source.identityAuthorityPolicy.quarantineArtifactPath, source.geocodingPolicy.quarantineArtifactPath, source.id + ' identity policy quarantine path must match geocodingPolicy');
  assert(Array.isArray(source.identityAuthorityPolicy.authoritySourceIds), source.id + ' identityAuthorityPolicy authoritySourceIds must be an array');
  assert(isNonEmptyString(source.identityAuthorityPolicy.scopeRule), source.id + ' identityAuthorityPolicy scopeRule is required');
  assert(isNonEmptyString(source.identityAuthorityPolicy.importRule), source.id + ' identityAuthorityPolicy importRule is required');
  assert(source.identityAuthorityPolicy.importRule.indexOf('does not provide coordinate authority') !== -1, source.id + ' identityAuthorityPolicy importRule must block coordinate overclaiming');
  assert(fs.existsSync(resolveRepoPath(source.identityAuthorityPolicy.reviewArtifactPath)), source.id + ' identity review artifact must exist');
  assert(fs.existsSync(resolveRepoPath(source.identityAuthorityPolicy.followupReviewArtifactPath)), source.id + ' identity follow-up review artifact must exist');
  assert(fs.existsSync(resolveRepoPath(source.identityAuthorityPolicy.albizuStagedReviewArtifactPath)), source.id + ' Albizu staged review artifact must exist');
  assert(fs.existsSync(resolveRepoPath(source.identityAuthorityPolicy.sagradoStagedReviewArtifactPath)), source.id + ' Sagrado staged review artifact must exist');
  assert(fs.existsSync(resolveRepoPath(source.identityAuthorityPolicy.sagradoGeocoderCandidateReviewArtifactPath)), source.id + ' Sagrado geocoder candidate review artifact must exist');

  var identitySource = findSourceById('nces-college-navigator-puerto-rico');
  assert(identitySource, source.id + ' stronger authority blocker requires the NCES corroboration source to be registered');
  assert(hasTargetTable(identitySource, 'unis-identity'), source.id + ' NCES corroboration source must target unis-identity');
  assert.strictEqual(identitySource.scope, 'puerto-rico-filtered', source.id + ' NCES corroboration source must stay Puerto Rico-filtered');
  assert.strictEqual(identitySource.scopeFilter, 'state:PR', source.id + ' NCES corroboration source must pin the Puerto Rico state filter');
  assert(
    identitySource.notes.indexOf('not a direct replacement row source') !== -1,
    source.id + ' NCES corroboration source notes must keep it out of the direct unis import path'
  );

  var accreditationSource = findSourceById('usdoe-dapip-puerto-rico');
  assert(accreditationSource, source.id + ' stronger authority blocker requires the U.S. Department of Education corroboration source to be registered');
  assert(hasTargetTable(accreditationSource, 'unis-accreditation'), source.id + ' U.S. Department of Education corroboration source must target unis-accreditation');
  assert.strictEqual(accreditationSource.scope, 'puerto-rico-filtered', source.id + ' U.S. Department of Education corroboration source must stay Puerto Rico-filtered');
  assert.strictEqual(accreditationSource.scopeFilter, 'state:Puerto Rico', source.id + ' U.S. Department of Education corroboration source must pin the Puerto Rico state filter');
  assert(
    accreditationSource.notes.indexOf('not as a direct legacy unis import source') !== -1,
    source.id + ' U.S. Department of Education corroboration source notes must keep it out of the direct unis import path'
  );

  var licensureSource = findSourceById('prdos-orlie-jip-postsecondary-listing');
  assert(licensureSource, source.id + ' stronger authority blocker requires the Puerto Rico ORLIE/JIP licensure source to be registered');
  assert(hasTargetTable(licensureSource, 'unis-licensure'), source.id + ' Puerto Rico ORLIE/JIP source must target unis-licensure');
  assert.strictEqual(licensureSource.scope, 'puerto-rico', source.id + ' Puerto Rico ORLIE/JIP source must stay Puerto Rico-scoped');
  assert(
    licensureSource.resourceUrl.indexOf('app.powerbigov.us') !== -1,
    source.id + ' Puerto Rico ORLIE/JIP source must keep the public listing surface registered'
  );
  assert(
    licensureSource.notes.indexOf('Power BI') !== -1,
    source.id + ' Puerto Rico ORLIE/JIP source notes must describe the Power BI public listing'
  );
  assert(
    licensureSource.notes.indexOf('not as a direct legacy unis import source') !== -1,
    source.id + ' Puerto Rico ORLIE/JIP source notes must keep it out of the direct unis import path'
  );

  validateUnisIdentityReview(source, identitySource, accreditationSource, licensureSource);
}

function validateUnisIdentityReview(source, identitySource, accreditationSource, licensureSource) {
  var identityReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.reviewArtifactPath), 'utf8'));
  var followupReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.followupReviewArtifactPath), 'utf8'));
  var albizuStagedReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.albizuStagedReviewArtifactPath), 'utf8'));
  var sagradoStagedReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.sagradoStagedReviewArtifactPath), 'utf8'));
  var sagradoGeocoderCandidateReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.sagradoGeocoderCandidateReviewArtifactPath), 'utf8'));
  var matchReview = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.matchReviewArtifactPath), 'utf8'));
  var quarantine = JSON.parse(fs.readFileSync(resolveRepoPath(source.identityAuthorityPolicy.quarantineArtifactPath), 'utf8'));
  var generated = JSON.parse(fs.readFileSync(resolveRepoPath('data/generated/unis-partial-import.json'), 'utf8'));
  var orlieReview = JSON.parse(fs.readFileSync(resolveRepoPath('data/unis/orlie-jip-row-review.json'), 'utf8'));
  var generatedNames = generated.rows.reduce(function(index, record) {
    index[record.title] = true;
    return index;
  }, {});
  var identityQuarantineByInstitution = quarantine.records.reduce(function(index, record) {
    if (
      record.exclusionReason.indexOf('No reviewed auxiliary IPEDS alias/campus match') !== -1 ||
      record.exclusionReason.indexOf('No exact source-backed institution identity match') !== -1
    ) {
      index[record.directoryInstitution] = record;
    }
    return index;
  }, {});
  var reviewByInstitution = identityReview.records.reduce(function(index, record) {
    index[record.directoryInstitution] = record;
    return index;
  }, {});

  assert.strictEqual(identityReview.schemaVersion, 1, source.id + ' identity review schemaVersion must be 1');
  assert.strictEqual(identityReview.sourceId, source.id, source.id + ' identity review sourceId must match');
  assert(isIsoDate(identityReview.generatedAt), source.id + ' identity review generatedAt must be ISO YYYY-MM-DD');
  assert.strictEqual(identityReview.buildCommand, 'node scripts/verify_unis_identity.js', source.id + ' identity review buildCommand mismatch');
  assert.strictEqual(identityReview.status, 'reviewed-excluded', source.id + ' identity review must remain reviewed-excluded');
  assert.strictEqual(identityReview.decision, 'retain-identity-quarantine', source.id + ' identity review decision mismatch');
  assert.strictEqual(identityReview.productBoundary, 'descriptive-only', source.id + ' identity review productBoundary must be descriptive-only');
  assert.strictEqual(identityReview.matchReviewArtifactPath, source.identityAuthorityPolicy.matchReviewArtifactPath, source.id + ' identity review match path must match policy');
  assert.strictEqual(identityReview.quarantineArtifactPath, source.identityAuthorityPolicy.quarantineArtifactPath, source.id + ' identity review quarantine path must match policy');
  assert(Array.isArray(identityReview.records), source.id + ' identity review records must be an array');
  assert.strictEqual(identityReview.summary.identityQuarantinedRows, matchReview.quarantinedRows.length, source.id + ' identity review summary must match match review quarantine rows');
  assert.strictEqual(identityReview.summary.identityQuarantinedRows, 27, source.id + ' identity review must cover 27 rows');
  assert.strictEqual(identityReview.summary.authorityReviewedRows, 5, source.id + ' identity review must record the narrow authority-reviewed subset');
  assert.strictEqual(identityReview.summary.identityCorroboratedRows, 5, source.id + ' identity review must record the narrow identity-corroborated subset');
  assert.strictEqual(identityReview.summary.dapipReviewedRows, 5, source.id + ' identity review must record the narrow DAPIP-reviewed subset');
  assert.strictEqual(identityReview.summary.orlieReviewedRows, 5, source.id + ' identity review must record the narrow ORLIE/JIP-reviewed subset');
  assert.strictEqual(identityReview.summary.identityPromotedRows, 0, source.id + ' identity review must not promote identity rows');
  assert.strictEqual(identityReview.summary.directImportEligibleRows, 0, source.id + ' identity review must not expose direct import eligibility');
  assert.strictEqual(identityReview.summary.coordinateEligibleRows, 0, source.id + ' identity review must not expose coordinate eligibility');
  assert.strictEqual(identityReview.summary.generatedOutputEligibleRows, 0, source.id + ' identity review must not expose generated output eligibility');
  assert.strictEqual(identityReview.summary.rowsWithoutRowLevelAuthorityCorroboration, 22, source.id + ' identity review must keep unreviewed authority rows explicit');
  assert.strictEqual(identityReview.summary.rowsStillMissingOrlieJipCorroboration, 22, source.id + ' identity review must keep remaining ORLIE/JIP gaps explicit');
  assert.strictEqual(identityReview.records.length, identityReview.summary.identityQuarantinedRows, source.id + ' identity review record count must match summary');
  assert.strictEqual(followupReview.schemaVersion, 1, source.id + ' identity follow-up schemaVersion must be 1');
  assert.strictEqual(followupReview.sourceId, source.id, source.id + ' identity follow-up sourceId must match');
  assert.strictEqual(followupReview.status, 'reviewed-no-promotion', source.id + ' identity follow-up must remain reviewed-no-promotion');
  assert.strictEqual(followupReview.decision, 'retain-identity-quarantine-for-corroborated-subset', source.id + ' identity follow-up decision mismatch');
  assert.strictEqual(followupReview.summary.reviewedRows, 5, source.id + ' identity follow-up must cover five rows');
  assert.strictEqual(followupReview.inputArtifacts.albizuStagedReviewArtifactPath, source.identityAuthorityPolicy.albizuStagedReviewArtifactPath, source.id + ' identity follow-up must reference Albizu staged review');
  assert.strictEqual(followupReview.inputArtifacts.sagradoStagedReviewArtifactPath, source.identityAuthorityPolicy.sagradoStagedReviewArtifactPath, source.id + ' identity follow-up must reference Sagrado staged review');
  assert.strictEqual(followupReview.summary.acceptedAliasCampusRows, 2, source.id + ' identity follow-up must record exactly two staged alias/campus rows');
  assert.strictEqual(followupReview.summary.reviewedPublicAddressRows, 2, source.id + ' identity follow-up must record exactly two staged public-address rows');
  assert.strictEqual(followupReview.summary.censusCacheEligibleRows, 0, source.id + ' identity follow-up must not imply Census-cache eligibility');
  assert.strictEqual(followupReview.summary.generatedOutputEligibleRows, 0, source.id + ' identity follow-up must not expose generated output eligibility');
  assert.strictEqual(albizuStagedReview.schemaVersion, 1, source.id + ' Albizu staged review schemaVersion must be 1');
  assert.strictEqual(albizuStagedReview.sourceId, source.id, source.id + ' Albizu staged review sourceId must match');
  assert.strictEqual(albizuStagedReview.status, 'staged-no-cache', source.id + ' Albizu staged review must remain pre-cache');
  assert.strictEqual(albizuStagedReview.decision, 'accept-albizu-alias-public-address-stage', source.id + ' Albizu staged review decision mismatch');
  assert.strictEqual(albizuStagedReview.productBoundary, 'descriptive-only', source.id + ' Albizu staged review productBoundary must be descriptive-only');
  assert.strictEqual(albizuStagedReview.inputArtifacts.censusCacheArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' Albizu staged cache path must match geocoding policy');
  assert.strictEqual(albizuStagedReview.inputArtifacts.quarantineArtifactPath, source.geocodingPolicy.quarantineArtifactPath, source.id + ' Albizu staged quarantine path must match geocoding policy');
  assert.strictEqual(albizuStagedReview.inputArtifacts.importBoundaryArtifactPath, source.geocodingPolicy.importBoundaryArtifactPath, source.id + ' Albizu staged boundary path must match geocoding policy');
  assert.strictEqual(albizuStagedReview.summary.acceptedAliasCampusRows, 1, source.id + ' Albizu staged review must record one alias/campus decision');
  assert.strictEqual(albizuStagedReview.summary.reviewedPublicAddressRows, 1, source.id + ' Albizu staged review must record one public-address decision');
  assert.strictEqual(albizuStagedReview.summary.censusCacheEligibleRows, 0, source.id + ' Albizu staged review must not create cache eligibility');
  assert.strictEqual(albizuStagedReview.summary.importEligibleRows, 0, source.id + ' Albizu staged review must not create import eligibility');
  assert.strictEqual(albizuStagedReview.summary.coordinateEligibleRows, 0, source.id + ' Albizu staged review must not create coordinate eligibility');
  assert.strictEqual(albizuStagedReview.summary.generatedOutputEligibleRows, 0, source.id + ' Albizu staged review must not create generated output eligibility');
  assert.strictEqual(albizuStagedReview.records.length, 1, source.id + ' Albizu staged review must contain one row');
  assert.strictEqual(albizuStagedReview.records[0].directoryInstitution, 'Universidad Carlos Albizu', source.id + ' Albizu staged review row mismatch');
  assert.strictEqual(albizuStagedReview.records[0].reviewedPublicAddress, '151 Calle Tanca, San Juan, PR 00901', source.id + ' Albizu staged public address mismatch');
  assert.strictEqual(albizuStagedReview.records[0].useForGeocoder, false, source.id + ' Albizu staged review must not authorize geocoding');
  assert.strictEqual(albizuStagedReview.records[0].censusResult.attemptedAddress, null, source.id + ' Albizu staged review must not store a geocoder attempt');
  assert.strictEqual(albizuStagedReview.records[0].coordinateEligible, false, source.id + ' Albizu staged review must not expose coordinates');
  assert.strictEqual(albizuStagedReview.records[0].generatedOutputEligible, false, source.id + ' Albizu staged review must not expose generated output');
  assert(albizuStagedReview.records[0].officialEvidence.some(function(evidence) {
    return evidence.sourceId === 'albizu-home' &&
      evidence.url === 'https://www.albizu.edu/?lang=es';
  }), source.id + ' Albizu staged review must cite official Albizu home evidence');
  assert(albizuStagedReview.records[0].officialEvidence.some(function(evidence) {
    return evidence.sourceId === 'albizu-san-juan' &&
      evidence.url === 'https://www.albizu.edu/san-juan/?lang=es';
  }), source.id + ' Albizu staged review must cite official Albizu San Juan evidence');
  assert.strictEqual(sagradoStagedReview.schemaVersion, 1, source.id + ' Sagrado staged review schemaVersion must be 1');
  assert.strictEqual(sagradoStagedReview.sourceId, source.id, source.id + ' Sagrado staged review sourceId must match');
  assert.strictEqual(sagradoStagedReview.status, 'staged-no-cache', source.id + ' Sagrado staged review must remain pre-cache');
  assert.strictEqual(sagradoStagedReview.decision, 'accept-sagrado-alias-public-address-stage', source.id + ' Sagrado staged review decision mismatch');
  assert.strictEqual(sagradoStagedReview.productBoundary, 'descriptive-only', source.id + ' Sagrado staged review productBoundary must be descriptive-only');
  assert.strictEqual(sagradoStagedReview.inputArtifacts.censusCacheArtifactPath, source.geocodingPolicy.cacheArtifactPath, source.id + ' Sagrado staged cache path must match geocoding policy');
  assert.strictEqual(sagradoStagedReview.inputArtifacts.geocoderCandidateReviewArtifactPath, source.identityAuthorityPolicy.sagradoGeocoderCandidateReviewArtifactPath, source.id + ' Sagrado staged review must reference candidate review');
  assert.strictEqual(sagradoStagedReview.inputArtifacts.quarantineArtifactPath, source.geocodingPolicy.quarantineArtifactPath, source.id + ' Sagrado staged quarantine path must match geocoding policy');
  assert.strictEqual(sagradoStagedReview.inputArtifacts.importBoundaryArtifactPath, source.geocodingPolicy.importBoundaryArtifactPath, source.id + ' Sagrado staged boundary path must match geocoding policy');
  assert.strictEqual(sagradoStagedReview.summary.acceptedAliasCampusRows, 1, source.id + ' Sagrado staged review must record one alias/campus decision');
  assert.strictEqual(sagradoStagedReview.summary.reviewedPublicAddressRows, 1, source.id + ' Sagrado staged review must record one public-address decision');
  assert.strictEqual(sagradoStagedReview.summary.censusCacheEligibleRows, 0, source.id + ' Sagrado staged review must not create cache eligibility');
  assert.strictEqual(sagradoStagedReview.summary.importEligibleRows, 0, source.id + ' Sagrado staged review must not create import eligibility');
  assert.strictEqual(sagradoStagedReview.summary.coordinateEligibleRows, 0, source.id + ' Sagrado staged review must not create coordinate eligibility');
  assert.strictEqual(sagradoStagedReview.summary.generatedOutputEligibleRows, 0, source.id + ' Sagrado staged review must not create generated output eligibility');
  assert.strictEqual(sagradoStagedReview.records.length, 1, source.id + ' Sagrado staged review must contain one row');
  assert.strictEqual(sagradoStagedReview.records[0].directoryInstitution, 'Universidad del Sagrado Corazón', source.id + ' Sagrado staged review row mismatch');
  assert.strictEqual(sagradoStagedReview.records[0].geocoderCandidateReviewArtifactPath, source.identityAuthorityPolicy.sagradoGeocoderCandidateReviewArtifactPath, source.id + ' Sagrado staged row must reference candidate review');
  assert.strictEqual(sagradoStagedReview.records[0].censusCacheDecision, 'read-only-candidate-review-no-cache-match', source.id + ' Sagrado staged review must record read-only no-cache result');
  assert(sagradoStagedReview.records[0].reviewedPublicAddress.indexOf('00914') !== -1, source.id + ' Sagrado staged public address must keep official ZIP 00914');
  assert(sagradoStagedReview.records[0].addressVarianceNotes.some(function(note) {
    return note.indexOf('nearby ZIP variance is recorded but does not block') !== -1;
  }), source.id + ' Sagrado staged review must record ZIP variance as non-blocking');
  assert.strictEqual(sagradoStagedReview.records[0].useForGeocoder, false, source.id + ' Sagrado staged review must not authorize geocoding');
  assert.strictEqual(sagradoStagedReview.records[0].censusResult.attemptedAddress, null, source.id + ' Sagrado staged review must not store a geocoder attempt');
  assert.strictEqual(sagradoStagedReview.records[0].coordinateEligible, false, source.id + ' Sagrado staged review must not expose coordinates');
  assert.strictEqual(sagradoStagedReview.records[0].generatedOutputEligible, false, source.id + ' Sagrado staged review must not expose generated output');
  assert.strictEqual(sagradoGeocoderCandidateReview.schemaVersion, 1, source.id + ' Sagrado geocoder candidate review schemaVersion must be 1');
  assert.strictEqual(sagradoGeocoderCandidateReview.sourceId, source.id, source.id + ' Sagrado geocoder candidate review sourceId must match');
  assert.strictEqual(sagradoGeocoderCandidateReview.status, 'reviewed-no-cache', source.id + ' Sagrado geocoder candidate review must stay non-cache');
  assert.strictEqual(sagradoGeocoderCandidateReview.decision, 'retain-sagrado-staged-no-cache', source.id + ' Sagrado geocoder candidate review decision mismatch');
  assert.strictEqual(sagradoGeocoderCandidateReview.benchmark, source.geocodingPolicy.benchmark, source.id + ' Sagrado candidate benchmark must match policy');
  assert.strictEqual(sagradoGeocoderCandidateReview.vintage, source.geocodingPolicy.vintage, source.id + ' Sagrado candidate vintage must match policy');
  assert.strictEqual(sagradoGeocoderCandidateReview.summary.candidateAddressCount, 3, source.id + ' Sagrado candidate review must record three address forms');
  assert.strictEqual(sagradoGeocoderCandidateReview.summary.candidateAddressesWithPuertoRicoMatches, 0, source.id + ' Sagrado candidate review must record zero Puerto Rico matches');
  assert.strictEqual(sagradoGeocoderCandidateReview.summary.cacheRecordsAdded, 0, source.id + ' Sagrado candidate review must not add cache records');
  assert.strictEqual(sagradoGeocoderCandidateReview.summary.coordinateEligibleRows, 0, source.id + ' Sagrado candidate review must not create coordinate eligibility');
  assert.strictEqual(sagradoGeocoderCandidateReview.summary.generatedOutputEligibleRows, 0, source.id + ' Sagrado candidate review must not create generated output eligibility');
  assert.strictEqual(sagradoGeocoderCandidateReview.records[0].candidateTests.length, 3, source.id + ' Sagrado candidate review must include the tested address forms');
  sagradoGeocoderCandidateReview.records[0].candidateTests.forEach(function(candidate) {
    assert(candidate.attemptedAddress.indexOf('00914') !== -1, source.id + ' Sagrado candidate address must use official ZIP 00914');
    assert.strictEqual(candidate.matchCount, 0, source.id + ' Sagrado candidate must record zero matches');
    assert.strictEqual(candidate.puertoRicoMatchCount, 0, source.id + ' Sagrado candidate must record zero Puerto Rico matches');
  });
  assert(unisGeocodingPolicy.indexOf('## ZIP Variance Rule') !== -1, source.id + ' geocoding policy must include ZIP variance rule');
  assert(unisGeocodingPolicy.indexOf('ZIP codes are supporting address evidence, not') !== -1, source.id + ' geocoding policy must treat ZIP as supporting evidence');
  assert.strictEqual(orlieReview.schemaVersion, 1, source.id + ' ORLIE/JIP row review schemaVersion must be 1');
  assert.strictEqual(orlieReview.sourceId, licensureSource.id, source.id + ' ORLIE/JIP row review sourceId must match registered source');
  assert.strictEqual(orlieReview.status, 'row-level-query-reviewed', source.id + ' ORLIE/JIP row review status mismatch');
  assert.strictEqual(orlieReview.productBoundary, 'descriptive-only', source.id + ' ORLIE/JIP row review product boundary mismatch');
  assert.strictEqual(orlieReview.summary.reviewedRows, 5, source.id + ' ORLIE/JIP row review must cover the five-row subset');
  assert.strictEqual(orlieReview.summary.matchedRows, 5, source.id + ' ORLIE/JIP row review must record five matched rows');
  assert.strictEqual(orlieReview.summary.importEligibleRows, 0, source.id + ' ORLIE/JIP row review must not create import eligibility');
  assert.strictEqual(orlieReview.summary.coordinateEligibleRows, 0, source.id + ' ORLIE/JIP row review must not create coordinate eligibility');
  assert.strictEqual(orlieReview.summary.generatedOutputEligibleRows, 0, source.id + ' ORLIE/JIP row review must not create generated output eligibility');
  assert.strictEqual(orlieReview.sourceContract.resourceKey, '2393e952-ae43-401c-9c03-fbae9ff20b5f', source.id + ' ORLIE/JIP resource key must be pinned');
  assert.strictEqual(orlieReview.sourceContract.tableEntity, 'Instituciones', source.id + ' ORLIE/JIP table entity must be pinned');
  assert(orlieReview.sourceContract.queryEndpoint.indexOf('/public/reports/querydata') !== -1, source.id + ' ORLIE/JIP query endpoint must be recorded');
  assert(orlieReview.sourceContract.excludedFields.indexOf('E-Mail') !== -1, source.id + ' ORLIE/JIP review must exclude personal contact fields');
  assert(Array.isArray(identityReview.authoritySourceReviewNotes), source.id + ' identity review authoritySourceReviewNotes must be an array');
  assert(identityReview.authoritySourceReviewNotes.some(function(note) {
    return note.sourceId === accreditationSource.id &&
      note.status === 'row-level-corroboration-recorded-for-nces-subset' &&
      note.reviewedRows === 5;
  }), source.id + ' identity review must record DAPIP row-level source review note');
  assert(identityReview.authoritySourceReviewNotes.some(function(note) {
    return note.sourceId === licensureSource.id &&
      note.status === 'row-level-corroboration-recorded-for-nces-dapip-subset' &&
      note.reviewedRows === 5 &&
      note.reviewArtifactPath === 'data/unis/orlie-jip-row-review.json';
  }), source.id + ' identity review must record ORLIE/JIP row-level source review note');

  [
    identitySource.id,
    accreditationSource.id,
    licensureSource.id
  ].forEach(function(sourceId) {
    assert(source.identityAuthorityPolicy.authoritySourceIds.indexOf(sourceId) !== -1, source.id + ' identity policy missing authority source: ' + sourceId);
  });

  matchReview.quarantinedRows.forEach(function(record) {
    assert(reviewByInstitution[record.directoryInstitution], source.id + ' identity review missing match-quarantined row: ' + record.directoryInstitution);
  });

  var ncesReviewedRows = [
    'Universidad Ana G. Méndez',
    'Universidad Carlos Albizu',
    'Universidad de Puerto Rico',
    'Universidad del Sagrado Corazón',
    'Universidad Interamericana de PR'
  ];

  identityReview.records.forEach(function(record) {
    assert(identityQuarantineByInstitution[record.directoryInstitution], source.id + ' identity review row must remain quarantined: ' + record.directoryInstitution);
    assert(!generatedNames[record.directoryInstitution], source.id + ' identity review row must be absent from generated output: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.classification), source.id + ' identity review classification is required: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.identityStatus), source.id + ' identity review status is required: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.corroborationStatus), source.id + ' identity review corroboration status is required: ' + record.directoryInstitution);
    assert.strictEqual(record.importEligible, false, source.id + ' identity review importEligible must be false: ' + record.directoryInstitution);
    assert.strictEqual(record.coordinateEligible, false, source.id + ' identity review coordinateEligible must be false: ' + record.directoryInstitution);
    assert.strictEqual(record.generatedOutputEligible, false, source.id + ' identity review generatedOutputEligible must be false: ' + record.directoryInstitution);
    assert(Array.isArray(record.authorityEvidenceReviewed), source.id + ' identity review authorityEvidenceReviewed must be an array');
    assert(Array.isArray(record.remainingAuthoritySources), source.id + ' identity review remainingAuthoritySources must be an array');
    assert(Array.isArray(record.requiredAuthoritySources), source.id + ' identity review requiredAuthoritySources must be an array');
    assert(record.requiredAuthoritySources.indexOf(identitySource.id) !== -1, source.id + ' identity review row missing NCES source: ' + record.directoryInstitution);
    assert(record.requiredAuthoritySources.indexOf(accreditationSource.id) !== -1, source.id + ' identity review row missing DAPIP source: ' + record.directoryInstitution);
    assert(record.requiredAuthoritySources.indexOf(licensureSource.id) !== -1, source.id + ' identity review row missing ORLIE/JIP source: ' + record.directoryInstitution);
    assert(Array.isArray(record.requiredPromotionEvidence), source.id + ' identity review requiredPromotionEvidence must be an array');
    assert(record.requiredPromotionEvidence.indexOf('reviewed Puerto Rico Census geocoder cache match') !== -1, source.id + ' identity review must keep Census cache evidence required: ' + record.directoryInstitution);
    assert(isNonEmptyString(record.directImportBlocker), source.id + ' identity review directImportBlocker is required: ' + record.directoryInstitution);

    if (ncesReviewedRows.indexOf(record.directoryInstitution) !== -1) {
      assert(record.classification.indexOf('nces-') === 0, source.id + ' NCES-reviewed row classification must be explicit: ' + record.directoryInstitution);
      assert(record.classification.indexOf('dapip') !== -1, source.id + ' DAPIP-reviewed row classification must be explicit: ' + record.directoryInstitution);
      assert(record.classification.indexOf('orlie') !== -1, source.id + ' ORLIE/JIP-reviewed row classification must be explicit: ' + record.directoryInstitution);
      assert.strictEqual(record.identityStatus, 'identity-corroborated-not-import-ready', source.id + ' NCES-reviewed row must not be import-ready: ' + record.directoryInstitution);
      assert.strictEqual(record.corroborationStatus, 'nces-dapip-orlie-row-reviewed', source.id + ' NCES/DAPIP/ORLIE-reviewed row corroboration mismatch: ' + record.directoryInstitution);
      assert.strictEqual(record.authorityEvidenceReviewed.length, 3, source.id + ' NCES/DAPIP/ORLIE-reviewed row must record exactly three authority evidence items: ' + record.directoryInstitution);
      assert.strictEqual(record.authorityEvidenceReviewed[0].sourceId, identitySource.id, source.id + ' NCES-reviewed row must cite NCES source: ' + record.directoryInstitution);
      assert(record.authorityEvidenceReviewed[0].sourceUrl.indexOf('https://nces.ed.gov/collegenavigator/?id=') === 0, source.id + ' NCES-reviewed row must cite College Navigator URL: ' + record.directoryInstitution);
      assert(record.authorityEvidenceReviewed.some(function(evidence) {
        return evidence.sourceId === accreditationSource.id &&
          evidence.sourceUrl.indexOf('https://ope.ed.gov/dapip/#/institution-profile/') === 0 &&
          evidence.apiInstitutionUrl.indexOf('https://ope.ed.gov/dapip/api/institutions/') === 0 &&
          evidence.apiAccreditationUrl.indexOf('https://ope.ed.gov/dapip/api/records/institutional/profile/') === 0 &&
          evidence.activeStatus === 'Active' &&
          evidence.accreditationStatus === 'Active';
      }), source.id + ' NCES/DAPIP-reviewed row must cite DAPIP evidence: ' + record.directoryInstitution);
      assert(record.authorityEvidenceReviewed.some(function(evidence) {
        return evidence.sourceId === licensureSource.id &&
          evidence.reviewArtifactPath === 'data/unis/orlie-jip-row-review.json' &&
          evidence.sourceUrl === 'https://www.estado.pr.gov/instituciones-educativas' &&
          evidence.reportUrl.indexOf('https://app.powerbigov.us/view?r=') === 0 &&
          isNonEmptyString(evidence.matchedName) &&
          isNonEmptyString(evidence.licenseExpiration) &&
          evidence.evidenceRole === 'licensure-listing-corroboration';
      }), source.id + ' NCES/DAPIP/ORLIE-reviewed row must cite ORLIE/JIP evidence: ' + record.directoryInstitution);
      assert.strictEqual(record.remainingAuthoritySources.indexOf(accreditationSource.id), -1, source.id + ' DAPIP-reviewed row must not still list DAPIP as unresolved: ' + record.directoryInstitution);
      assert.strictEqual(record.remainingAuthoritySources.indexOf(licensureSource.id), -1, source.id + ' ORLIE/JIP-reviewed row must not still list ORLIE/JIP as unresolved: ' + record.directoryInstitution);
    } else {
      assert.strictEqual(record.classification, 'identity-authority-review-required', source.id + ' unreviewed identity row classification mismatch: ' + record.directoryInstitution);
      assert.strictEqual(record.identityStatus, 'not-import-ready', source.id + ' unreviewed identity row status mismatch: ' + record.directoryInstitution);
      assert.strictEqual(record.corroborationStatus, 'not-row-reviewed', source.id + ' unreviewed identity row corroboration mismatch: ' + record.directoryInstitution);
      assert.strictEqual(record.authorityEvidenceReviewed.length, 0, source.id + ' unreviewed identity row must not claim row-level authority evidence: ' + record.directoryInstitution);
    }
  });
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
  assert(
    hasPuertoRicoScope(source),
    source.id + ' must be Puerto Rico-only or use an approved deterministic Puerto Rico scope filter'
  );

  if (hasActiveMappedTarget(source)) {
    assert(source.legacySchemaMap && typeof source.legacySchemaMap === 'object', source.id + ' must include legacySchemaMap');
    assert(source.importReadiness && typeof source.importReadiness === 'object', source.id + ' must include importReadiness');
    assert(
      source.importReadiness.status === 'blocked' || source.importReadiness.status === 'partial' || source.importReadiness.status === 'ready',
      source.id + ' importReadiness.status must be blocked, partial, or ready'
    );
    assert(isIsoDate(source.importReadiness.reviewedAt), source.id + ' importReadiness.reviewedAt must be an ISO YYYY-MM-DD date');
    assert(Array.isArray(source.importReadiness.blockers), source.id + ' importReadiness.blockers must be an array');
    if (source.importReadiness.status === 'blocked') {
      assert(source.importReadiness.blockers.length > 0, source.id + ' blocked importReadiness must include blockers');
    }
    if (source.importReadiness.status === 'partial') {
      assert(source.importReadiness.blockers.length > 0, source.id + ' partial importReadiness must keep blockers for full readiness');
      assert(source.importReadiness.coverage && typeof source.importReadiness.coverage === 'object', source.id + ' partial importReadiness must include coverage');
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
      validateUnisAuthorityStack(source);

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
