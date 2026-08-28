'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var artifactPath = path.join(__dirname, '..', 'data', 'profile-reach', 'aguada-restaurant-large-site-screening-review.json');
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
  'aguada-territorial-plan-order-2024',
  'pr-jp-mipr-site-screening',
  'pr-jp-flood-determination-service',
  'aguada-hazard-mitigation-plan-2020',
  'pr-jp-district-legend'
];

assert.strictEqual(artifact.schemaVersion, 1, 'artifact schemaVersion must be 1');
assert.strictEqual(artifact.artifactVersion, 'aguada-restaurant-large-site-screening-review-v1', 'artifactVersion mismatch');
assert.strictEqual(artifact.scope, profileContract.scope, 'artifact scope must match the profile contract scope');
assert.strictEqual(artifact.status, 'reviewed', 'artifact status must be reviewed');
assert.strictEqual(artifact.reviewedAt, '2026-07-30', 'artifact reviewedAt mismatch');
assert.strictEqual(artifact.signalId, 'large-site-feasibility-gap', 'artifact signalId mismatch');
assert(signal, 'artifact signalId must exist in the decision-signal registry');
assert.strictEqual(signal.sourceType, 'registered-source', 'large-site signal must be registered-source');
assert.strictEqual(signal.sourceId, 'aguada-territorial-plan-order-2024', 'large-site signal sourceId mismatch');

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
  'authority sourceIds must follow the reviewed large-site stack'
);

artifact.authorities.forEach(function(authority) {
  var source = sourcesById[authority.sourceId];

  assert(source, 'authority source must exist in source registry: ' + authority.sourceId);
  assert.strictEqual(source.scope, 'puerto-rico', authority.sourceId + ' must remain Puerto Rico-scoped');
  assert.strictEqual(source.targetTables.length, 1, authority.sourceId + ' must stay on a single planning-profile lane');
  assert.strictEqual(source.targetTables[0], 'planning-profile-site-feasibility', authority.sourceId + ' must target planning-profile-site-feasibility');
  assert(isNonEmptyString(authority.role), authority.sourceId + ' authority role is required');
  assert(isNonEmptyString(authority.evidence), authority.sourceId + ' authority evidence is required');
  assertNoForbiddenDecisionLanguage(authority.evidence, authority.sourceId + ' authority evidence');
});

assert.deepStrictEqual(signal.supportingSourceIds, expectedAuthorityIds.slice(1), 'signal supportingSourceIds must match reviewed supporting sources');
assert(signal.artifactPaths.indexOf('data/profile-reach/aguada-restaurant-large-site-screening-review.json') !== -1, 'signal must link to the reviewed large-site artifact');

assert(Array.isArray(artifact.scenarioCoverage), 'scenarioCoverage must be an array');
assert.strictEqual(artifact.scenarioCoverage.length, 1, 'scenarioCoverage must cover large-strategic only');
assert.strictEqual(artifact.scenarioCoverage[0].scenarioId, 'large-strategic', 'scenarioCoverage scenarioId mismatch');
assert.strictEqual(artifact.scenarioCoverage[0].reachId, 'site-bound', 'scenarioCoverage reachId must stay site-bound');
assert.strictEqual(artifact.scenarioCoverage[0].coverage, 'descriptive-large-site-screening-baseline', 'scenarioCoverage coverage mismatch');
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
