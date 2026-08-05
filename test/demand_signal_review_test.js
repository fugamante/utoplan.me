'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var artifactPath = path.join(__dirname, '..', 'data', 'profile-reach', 'aguada-restaurant-demand-proxy-review.json');
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
  'pr-tourism-registration-occupancy-2024',
  'pr-tourism-visitor-profile-fy2023-2024'
];

assert.strictEqual(artifact.schemaVersion, 1, 'artifact schemaVersion must be 1');
assert.strictEqual(artifact.artifactVersion, 'aguada-restaurant-demand-proxy-review-v1', 'artifactVersion mismatch');
assert.strictEqual(artifact.scope, profileContract.scope, 'artifact scope must match the profile contract scope');
assert.strictEqual(artifact.status, 'reviewed', 'artifact status must be reviewed');
assert.strictEqual(artifact.reviewedAt, '2026-08-05', 'artifact reviewedAt mismatch');
assert.strictEqual(artifact.signalId, 'west-region-visitor-demand-baseline', 'artifact signalId mismatch');
assert(signal, 'artifact signalId must exist in the decision-signal registry');
assert.strictEqual(signal.sourceType, 'registered-source', 'demand signal must be registered-source');

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
  'authority sourceIds must follow the reviewed demand stack'
);

artifact.authorities.forEach(function(authority) {
  var source = sourcesById[authority.sourceId];

  assert(source, 'authority source must exist in source registry: ' + authority.sourceId);
  assert.strictEqual(source.scope, 'puerto-rico', authority.sourceId + ' must remain Puerto Rico-scoped');
  assert.strictEqual(source.targetTables.length, 1, authority.sourceId + ' must stay on a single planning-profile lane');
  assert.strictEqual(source.targetTables[0], 'planning-profile-demand', authority.sourceId + ' must target planning-profile-demand');
  assert(isNonEmptyString(authority.role), authority.sourceId + ' authority role is required');
  assert(isNonEmptyString(authority.evidence), authority.sourceId + ' authority evidence is required');
  assertNoForbiddenDecisionLanguage(authority.evidence, authority.sourceId + ' authority evidence');
});

assert.deepStrictEqual(signal.supportingSourceIds, expectedAuthorityIds.slice(1), 'signal supportingSourceIds must match reviewed supporting sources');
assert(signal.artifactPaths.indexOf('data/profile-reach/aguada-restaurant-demand-proxy-review.json') !== -1, 'signal must link to the reviewed demand artifact');

assert(Array.isArray(artifact.scenarioCoverage), 'scenarioCoverage must be an array');
assert.strictEqual(artifact.scenarioCoverage.length, 1, 'scenarioCoverage must cover medium-regional only');
assert.strictEqual(artifact.scenarioCoverage[0].scenarioId, 'medium-regional', 'scenarioCoverage scenarioId mismatch');
assert.strictEqual(artifact.scenarioCoverage[0].reachId, 'regional-corridor', 'scenarioCoverage reachId mismatch');
assert.strictEqual(artifact.scenarioCoverage[0].coverage, 'descriptive-demand-proxy-baseline', 'scenarioCoverage coverage mismatch');
assert(Array.isArray(artifact.scenarioCoverage[0].notes) && artifact.scenarioCoverage[0].notes.length >= 2, 'scenarioCoverage notes are required');
artifact.scenarioCoverage[0].notes.forEach(function(note, index) {
  assert(isNonEmptyString(note), 'scenarioCoverage note is required at index ' + index);
  assertNoForbiddenDecisionLanguage(note, 'scenarioCoverage note ' + index);
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
