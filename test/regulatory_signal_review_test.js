'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var artifactPath = path.join(__dirname, '..', 'data', 'profile-reach', 'aguada-restaurant-permit-path-review.json');
var signalRegistryPath = path.join(__dirname, '..', 'data', 'profile-reach', 'decision-signal-registry-v1.json');
var profileContractPath = path.join(__dirname, '..', 'data', 'profile-reach', 'business-profile-reach-v1.json');
var sourceRegistryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');

var artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
var signalRegistry = JSON.parse(fs.readFileSync(signalRegistryPath, 'utf8'));
var profileContract = JSON.parse(fs.readFileSync(profileContractPath, 'utf8'));
var sourceRegistry = JSON.parse(fs.readFileSync(sourceRegistryPath, 'utf8'));

var FORBIDDEN_DECISION_PATTERN = /\b(score|rank|ranking|recommend|best|should choose|profitable|suitability)\b/i;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function assertNoForbiddenDecisionLanguage(value, label) {
  assert(!FORBIDDEN_DECISION_PATTERN.test(value), label + ' must stay descriptive');
}

function toMap(items) {
  return items.reduce(function(result, item) {
    result[item.id] = item;
    return result;
  }, {});
}

var signalsById = toMap(signalRegistry.signals);
var sourcesById = toMap(sourceRegistry.sources);
var signal = signalsById[artifact.signalId];
var expectedAuthorityIds = [
  'pr-ogpe-permiso-unico-business-path',
  'pr-bomberos-commercial-permit-basics',
  'pr-health-salud-digital-portal',
  'pr-ogp-municipal-patent-2026-2027'
];

assert.strictEqual(artifact.schemaVersion, 1, 'artifact schemaVersion must be 1');
assert.strictEqual(artifact.artifactVersion, 'aguada-restaurant-permit-path-review-v1', 'artifactVersion mismatch');
assert.strictEqual(artifact.scope, profileContract.scope, 'artifact scope must match the profile contract scope');
assert.strictEqual(artifact.status, 'reviewed', 'artifact status must be reviewed');
assert.strictEqual(artifact.reviewedAt, '2026-07-29', 'artifact reviewedAt mismatch');
assert.strictEqual(artifact.signalId, 'food-service-permit-path-gap', 'artifact signalId mismatch');
assert(signal, 'artifact signalId must exist in the decision-signal registry');
assert.strictEqual(signal.sourceType, 'registered-source', 'regulatory signal must be registered-source');

assert.deepStrictEqual(
  artifact.fixedSelection,
  {
    fixtureId: profileContract.fixedSelection.fixtureId,
    municipalityCode: profileContract.fixedSelection.municipality.code,
    municipalityLabel: profileContract.fixedSelection.municipality.label,
    businessCategoryId: profileContract.fixedSelection.businessCategory.id,
    selectedNaicsCodes: profileContract.fixedSelection.businessCategory.selectedNaicsCodes
  },
  'artifact fixedSelection must match the profile contract fixed selection'
);

assert(isNonEmptyString(artifact.decisionSummary), 'decisionSummary is required');
assertNoForbiddenDecisionLanguage(artifact.decisionSummary, 'decisionSummary');

assert(Array.isArray(artifact.authorities), 'authorities must be an array');
assert.strictEqual(artifact.authorities.length, expectedAuthorityIds.length, 'authority count mismatch');
assert.deepStrictEqual(
  artifact.authorities.map(function(authority) { return authority.sourceId; }),
  expectedAuthorityIds,
  'authority sourceIds must follow the reviewed regulatory stack'
);

artifact.authorities.forEach(function(authority) {
  var source = sourcesById[authority.sourceId];

  assert(source, 'authority source must exist in source registry: ' + authority.sourceId);
  assert.strictEqual(source.scope, 'puerto-rico', authority.sourceId + ' must remain Puerto Rico-scoped');
  assert.strictEqual(source.targetTables.length, 1, authority.sourceId + ' must stay on a single planning-profile lane');
  assert.strictEqual(source.targetTables[0], 'planning-profile-regulatory', authority.sourceId + ' must target planning-profile-regulatory');
  assert(isNonEmptyString(authority.role), authority.sourceId + ' authority role is required');
  assert(isNonEmptyString(authority.evidence), authority.sourceId + ' authority evidence is required');
  assertNoForbiddenDecisionLanguage(authority.evidence, authority.sourceId + ' authority evidence');
});

assert.deepStrictEqual(signal.supportingSourceIds, expectedAuthorityIds.slice(1), 'signal supportingSourceIds must match reviewed supporting sources');
assert(signal.artifactPaths.indexOf('data/profile-reach/aguada-restaurant-permit-path-review.json') !== -1, 'signal must link to the reviewed permit-path artifact');

assert(Array.isArray(artifact.scenarioCoverage), 'scenarioCoverage must be an array');
assert.strictEqual(artifact.scenarioCoverage.length, 2, 'scenarioCoverage must cover small-local and medium-regional only');
artifact.scenarioCoverage.forEach(function(entry) {
  assert(entry.scenarioId === 'small-local' || entry.scenarioId === 'medium-regional', 'unexpected scenarioCoverage scenarioId: ' + entry.scenarioId);
  assert.strictEqual(entry.reachId, 'site-bound', 'scenarioCoverage reachId must stay site-bound for ' + entry.scenarioId);
  assert.strictEqual(entry.coverage, 'descriptive-permit-path', 'scenarioCoverage coverage mismatch for ' + entry.scenarioId);
  assert(Array.isArray(entry.notes) && entry.notes.length >= 2, 'scenarioCoverage notes are required for ' + entry.scenarioId);
  entry.notes.forEach(function(note, index) {
    assert(isNonEmptyString(note), 'scenarioCoverage note is required for ' + entry.scenarioId + ' at index ' + index);
    assertNoForbiddenDecisionLanguage(note, entry.scenarioId + ' scenarioCoverage note ' + index);
  });
});

assert(Array.isArray(artifact.interpretationLimits) && artifact.interpretationLimits.length >= 3, 'interpretationLimits are required');
artifact.interpretationLimits.forEach(function(limit, index) {
  assert(isNonEmptyString(limit), 'interpretationLimit is required at index ' + index);
  assertNoForbiddenDecisionLanguage(limit, 'interpretationLimit ' + index);
});

assert(Array.isArray(artifact.nextUpgradeTargets) && artifact.nextUpgradeTargets.length >= 2, 'nextUpgradeTargets are required');
artifact.nextUpgradeTargets.forEach(function(target, index) {
  assert(isNonEmptyString(target), 'nextUpgradeTarget is required at index ' + index);
  assertNoForbiddenDecisionLanguage(target, 'nextUpgradeTarget ' + index);
});
