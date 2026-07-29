'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var contractPath = path.join(__dirname, '..', 'data', 'profile-reach', 'business-profile-reach-v1.json');
var registryPath = path.join(__dirname, '..', 'data', 'profile-reach', 'decision-signal-registry-v1.json');
var sourceRegistryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');

var contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
var sourceRegistry = JSON.parse(fs.readFileSync(sourceRegistryPath, 'utf8'));

var EXPECTED_SCENARIO_IDS = [
  'small-local',
  'medium-regional',
  'large-strategic'
];
var EXPECTED_REACH_IDS = [
  'site-bound',
  'local-catchment',
  'regional-corridor',
  'island-wide',
  'external-connection'
];
var EXPECTED_LENS_IDS = [
  'hard-constraints-site-feasibility',
  'demand-market-reach',
  'infrastructure-reliability-cost',
  'workforce-capability',
  'logistics-supply-chain',
  'regulatory-execution-environment',
  'ecosystem-resilience-growth'
];
var ALLOWED_SOURCE_TYPES = {
  'registered-source': true,
  'source-gap': true
};
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

function findAssessmentByLens(scenario, lensId) {
  return scenario.decisionLensAssessments.find(function(assessment) {
    return assessment.lensId === lensId;
  });
}

function buildFactMap(scenarios) {
  return scenarios.reduce(function(result, scenario) {
    scenario.decisionLensAssessments.forEach(function(assessment) {
      assessment.facts.forEach(function(fact) {
        result[fact.id] = {
          scenarioId: scenario.id,
          lensId: assessment.lensId,
          fact: fact
        };
      });
    });
    return result;
  }, {});
}

var sourcesById = toMap(sourceRegistry.sources);
var factsById = buildFactMap(contract.scenarios);
var signalsById = toMap(registry.signals);
var lensCoverage = {};
var referencedSignalIds = {};

assert.strictEqual(registry.schemaVersion, 1, 'registry schemaVersion must be 1');
assert.strictEqual(registry.registryVersion, 'decision-signal-registry-v1', 'registryVersion mismatch');
assert.strictEqual(registry.scope, contract.scope, 'registry scope must match profile/reach contract scope');
assert.strictEqual(registry.status, contract.status, 'registry status must match profile/reach contract status');
assert.strictEqual(registry.updatedAt, contract.updatedAt, 'registry updatedAt must match profile/reach contract updatedAt');

assert.deepStrictEqual(
  registry.fixedSelection,
  {
    fixtureId: contract.fixedSelection.fixtureId,
    municipalityCode: contract.fixedSelection.municipality.code,
    businessCategoryId: contract.fixedSelection.businessCategory.id,
    selectedNaicsCodes: contract.fixedSelection.businessCategory.selectedNaicsCodes
  },
  'registry fixedSelection must match the profile/reach fixed selection'
);

assert(Array.isArray(registry.signals), 'signals must be an array');
assert(registry.signals.length >= EXPECTED_LENS_IDS.length, 'signals must cover all decision lenses');

registry.signals.forEach(function(signal) {
  assert(isNonEmptyString(signal.id), 'signal id is required');
  assert(EXPECTED_LENS_IDS.indexOf(signal.lensId) !== -1, 'signal lensId is invalid for ' + signal.id);
  assert(isNonEmptyString(signal.label), 'signal label is required for ' + signal.id);
  assert(ALLOWED_SOURCE_TYPES[signal.sourceType], 'signal sourceType is invalid for ' + signal.id);
  assert(Array.isArray(signal.applicableScenarioIds) && signal.applicableScenarioIds.length >= 1, 'applicableScenarioIds are required for ' + signal.id);
  assert(signal.reachByScenario && typeof signal.reachByScenario === 'object', 'reachByScenario is required for ' + signal.id);
  assert(Array.isArray(signal.factIds) && signal.factIds.length >= 1, 'factIds are required for ' + signal.id);
  assert(signal.recency && typeof signal.recency === 'object', 'recency is required for ' + signal.id);
  assert(Array.isArray(signal.interpretationLimits) && signal.interpretationLimits.length >= 2, 'interpretationLimits are required for ' + signal.id);
  lensCoverage[signal.lensId] = true;

  assertNoForbiddenDecisionLanguage(signal.label, signal.id + ' label');
  signal.interpretationLimits.forEach(function(limit, index) {
    assert(isNonEmptyString(limit), 'interpretation limit is required for ' + signal.id + ' at index ' + index);
    assertNoForbiddenDecisionLanguage(limit, signal.id + ' interpretation limit ' + index);
  });

  signal.applicableScenarioIds.forEach(function(scenarioId) {
    assert(EXPECTED_SCENARIO_IDS.indexOf(scenarioId) !== -1, 'signal scenario is invalid for ' + signal.id + ': ' + scenarioId);
    assert(EXPECTED_REACH_IDS.indexOf(signal.reachByScenario[scenarioId]) !== -1, 'signal reachByScenario is invalid for ' + signal.id + ': ' + scenarioId);
  });

  if (signal.sourceType === 'registered-source') {
    assert(isNonEmptyString(signal.sourceId), 'registered-source signal must include sourceId for ' + signal.id);
    assert(sourcesById[signal.sourceId], 'registered-source signal sourceId must exist in the source registry for ' + signal.id);
    assert(Array.isArray(signal.artifactPaths) && signal.artifactPaths.length >= 1, 'registered-source signal must include artifactPaths for ' + signal.id);
    assert(isNonEmptyString(signal.recency.evidenceDate), 'registered-source signal must include recency.evidenceDate for ' + signal.id);
  } else {
    assert(!signal.sourceId, 'source-gap signal must not include sourceId for ' + signal.id);
    assert(isNonEmptyString(signal.sourceGapBasis), 'source-gap signal must include sourceGapBasis for ' + signal.id);
    assertNoForbiddenDecisionLanguage(signal.sourceGapBasis, signal.id + ' sourceGapBasis');
  }

  signal.factIds.forEach(function(factId) {
    var linked = factsById[factId];

    assert(linked, 'signal factId must exist in the profile/reach contract for ' + signal.id + ': ' + factId);
    assert.strictEqual(linked.lensId, signal.lensId, 'signal lens must match fact lens for ' + signal.id + ': ' + factId);
    assert(signal.applicableScenarioIds.indexOf(linked.scenarioId) !== -1, 'signal must list the linked scenario for ' + signal.id + ': ' + linked.scenarioId);
    assert.strictEqual(linked.fact.signalId, signal.id, 'fact signalId must point back to registry signal for ' + factId);
    assert.strictEqual(linked.fact.sourceType, signal.sourceType, 'fact sourceType must match signal sourceType for ' + factId);
    assert.strictEqual(linked.fact.reachId, signal.reachByScenario[linked.scenarioId], 'fact reachId must match registry reachByScenario for ' + factId);

    if (signal.sourceType === 'registered-source') {
      assert.strictEqual(linked.fact.sourceId, signal.sourceId, 'fact sourceId must match registry sourceId for ' + factId);
    }

    referencedSignalIds[signal.id] = true;
  });
});

EXPECTED_LENS_IDS.forEach(function(lensId) {
  assert(lensCoverage[lensId], 'registry must include at least one signal for lens ' + lensId);
});

contract.scenarios.forEach(function(scenario) {
  scenario.decisionLensAssessments.forEach(function(assessment) {
    assessment.facts.forEach(function(fact) {
      var signal = signalsById[fact.signalId];

      assert(isNonEmptyString(fact.signalId), 'fact signalId is required for ' + fact.id);
      assert(signal, 'fact signalId must exist in the registry for ' + fact.id);
      assert(signal.factIds.indexOf(fact.id) !== -1, 'registry signal must list the fact id for ' + fact.id);
      assert(signal.applicableScenarioIds.indexOf(scenario.id) !== -1, 'registry signal must list the scenario for ' + fact.id);
    });
  });
});

assert.deepStrictEqual(
  Object.keys(referencedSignalIds).sort(),
  Object.keys(signalsById).sort(),
  'every registry signal must be connected to at least one profile/reach fact'
);

assert.strictEqual(
  findAssessmentByLens(contract.scenarios[0], 'demand-market-reach').facts[0].signalId,
  'municipality-restaurant-activity-baseline',
  'small/local demand baseline should link to the CBP-backed demand signal'
);
