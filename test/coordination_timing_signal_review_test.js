'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var artifact = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'profile-reach', 'aguada-restaurant-coordination-timing-review.json'), 'utf8'));
var registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'profile-reach', 'decision-signal-registry-v1.json'), 'utf8'));
var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'profile-reach', 'business-profile-reach-v1.json'), 'utf8'));
var sources = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json'), 'utf8'));
var forbidden = /\b(score|rank|ranking|recommend|best|should choose|profitable|suitability)\b/i;

function mapById(items) {
  return items.reduce(function(result, item) { result[item.id] = item; return result; }, {});
}

function assertDescriptive(value, label) {
  assert.strictEqual(typeof value, 'string', label + ' must be a string');
  assert(value.trim(), label + ' must not be blank');
  assert(!forbidden.test(value), label + ' must stay descriptive');
}

var signals = mapById(registry.signals);
var sourceById = mapById(sources.sources);
var signal = signals[artifact.signalId];
var authorityIds = ['ddec-permit-task-force-coordination-timing-2025', 'pr-statistics-pemas-construction-permits'];

assert.strictEqual(artifact.schemaVersion, 1);
assert.strictEqual(artifact.artifactVersion, 'aguada-restaurant-coordination-timing-review-v1');
assert.strictEqual(artifact.scope, profile.scope);
assert.strictEqual(artifact.status, 'reviewed');
assert.strictEqual(artifact.reviewedAt, '2026-08-22');
assert.strictEqual(artifact.signalId, 'strategic-coordination-timing-baseline');
assert(signal, 'signal must exist');
assert.strictEqual(signal.sourceType, 'registered-source');
assert.strictEqual(signal.sourceId, authorityIds[0]);
assert.deepStrictEqual(signal.supportingSourceIds, authorityIds.slice(1));
assert.deepStrictEqual(signal.applicableScenarioIds, ['large-strategic']);
assert.deepStrictEqual(signal.reachByScenario, { 'large-strategic': 'regional-corridor' });
assert.deepStrictEqual(signal.factIds, ['large-strategic-multi-agency-approvals']);
assert(signal.artifactPaths.indexOf('data/profile-reach/aguada-restaurant-coordination-timing-review.json') !== -1);
assert.deepStrictEqual(artifact.fixedSelection, {
  fixtureId: profile.fixedSelection.fixtureId,
  municipalityCode: profile.fixedSelection.municipality.code,
  municipalityLabel: profile.fixedSelection.municipality.label,
  businessCategoryId: profile.fixedSelection.businessCategory.id,
  selectedNaicsCodes: profile.fixedSelection.businessCategory.selectedNaicsCodes
});
assertDescriptive(artifact.decisionSummary, 'decisionSummary');
assert.deepStrictEqual(artifact.authorities.map(function(authority) { return authority.sourceId; }), authorityIds);
artifact.authorities.forEach(function(authority) {
  var source = sourceById[authority.sourceId];
  assert(source, 'authority source must exist: ' + authority.sourceId);
  assert.strictEqual(source.scope, 'puerto-rico');
  assert.deepStrictEqual(source.targetTables, ['planning-profile-regulatory']);
  assertDescriptive(authority.role, 'authority role');
  assertDescriptive(authority.evidence, 'authority evidence');
});
assert.strictEqual(artifact.scenarioCoverage.length, 1);
assert.strictEqual(artifact.scenarioCoverage[0].scenarioId, 'large-strategic');
assert.strictEqual(artifact.scenarioCoverage[0].reachId, 'regional-corridor');
assert.strictEqual(artifact.scenarioCoverage[0].coverage, 'descriptive-interagency-coordination-timing-baseline');
artifact.scenarioCoverage[0].notes.forEach(function(note) { assertDescriptive(note, 'scenario coverage note'); });
artifact.interpretationLimits.forEach(function(limit) { assertDescriptive(limit, 'interpretation limit'); });
artifact.nextUpgradeTargets.forEach(function(target) { assertDescriptive(target, 'next upgrade target'); });
assert(artifact.interpretationLimits.length >= 4);
assert(artifact.nextUpgradeTargets.length >= 3);
