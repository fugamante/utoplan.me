'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var contractPath = path.join(__dirname, '..', 'data', 'profile-reach', 'business-profile-reach-v1.json');
var fixturePath = path.join(__dirname, '..', 'data', 'planning-context', 'mun003_restaurant.json');
var mappingPath = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');
var municipalityRegistryPath = path.join(__dirname, '..', 'data', 'municipalities', 'planning-context-municipalities.json');
var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var signalRegistryPath = path.join(__dirname, '..', 'data', 'profile-reach', 'decision-signal-registry-v1.json');

var contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
var fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
var mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
var municipalityRegistry = JSON.parse(fs.readFileSync(municipalityRegistryPath, 'utf8'));
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
var signalRegistry = JSON.parse(fs.readFileSync(signalRegistryPath, 'utf8'));

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
var EXPECTED_SCENARIO_IDS = [
  'small-local',
  'medium-regional',
  'large-strategic'
];
var ALLOWED_RELEVANCE = {
  primary: true,
  secondary: true,
  informational: true
};
var ALLOWED_CRITICALITY = {
  blocker: true,
  'material-tradeoff': true,
  secondary: true,
  informational: true
};
var ALLOWED_CONFIDENCE = {
  low: true,
  medium: true,
  high: true
};
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

function toSourceIdSet(sources) {
  return sources.reduce(function(result, source) {
    result[source.id] = true;
    return result;
  }, {});
}

function toMunicipalityNameMap(entries) {
  return entries.reduce(function(result, entry) {
    result[entry.code] = entry.name;
    return result;
  }, {});
}

function toSignalIdSet(signals) {
  return signals.reduce(function(result, signal) {
    result[signal.id] = true;
    return result;
  }, {});
}

function findCategory(id) {
  return mapping.categories.find(function(category) {
    return category.id === id;
  });
}

function findScenario(id) {
  return contract.scenarios.find(function(scenario) {
    return scenario.id === id;
  });
}

function findAssessment(scenario, lensId) {
  return scenario.decisionLensAssessments.find(function(assessment) {
    return assessment.lensId === lensId;
  });
}

var sourceIds = toSourceIdSet(registry.sources);
var municipalityNames = toMunicipalityNameMap(municipalityRegistry.entries);
var signalIds = toSignalIdSet(signalRegistry.signals);
var category = findCategory(contract.fixedSelection.businessCategory.id);

assert.strictEqual(contract.schemaVersion, 1, 'schemaVersion must be 1');
assert.strictEqual(contract.contractVersion, 'business-profile-reach-v1', 'contractVersion mismatch');
assert.strictEqual(contract.scope, 'puerto-rico-planning-candidate', 'scope mismatch');
assert.strictEqual(contract.status, 'candidate-needs-review', 'status mismatch');
assert(isNonEmptyString(contract.updatedAt), 'updatedAt is required');

assert(contract.rules && typeof contract.rules === 'object', 'rules are required');
assert.strictEqual(contract.rules.noScores, true, 'noScores must be true');
assert.strictEqual(contract.rules.noRankings, true, 'noRankings must be true');
assert.strictEqual(contract.rules.noRecommendations, true, 'noRecommendations must be true');
assert.strictEqual(contract.rules.requiresProfileDependentCriticality, true, 'requiresProfileDependentCriticality must be true');
assert.strictEqual(contract.rules.requiresVisibleLimitations, true, 'requiresVisibleLimitations must be true');
assert.strictEqual(contract.rules.requiresNextValidationCheck, true, 'requiresNextValidationCheck must be true');

assert(contract.fixedSelection && typeof contract.fixedSelection === 'object', 'fixedSelection is required');
assert.strictEqual(contract.fixedSelection.fixtureId, 'mun003_restaurant', 'fixtureId mismatch');
assert.strictEqual(contract.fixedSelection.municipality.code, fixture.municipality.code, 'fixedSelection municipality must match fixture municipality');
assert.strictEqual(contract.fixedSelection.municipality.label, fixture.municipality.label, 'fixedSelection municipality label must match fixture');
assert.strictEqual(contract.fixedSelection.municipality.label, municipalityNames[fixture.municipality.code], 'fixedSelection municipality label must match registry');
assert.strictEqual(contract.fixedSelection.businessCategory.id, fixture.businessCategory.id, 'fixedSelection category must match fixture category');
assert(category, 'fixedSelection category must exist in category mapping');
assert.strictEqual(contract.fixedSelection.businessCategory.displayName, category.displayName, 'fixedSelection displayName must match mapping');
assert.deepStrictEqual(contract.fixedSelection.businessCategory.selectedNaicsCodes, fixture.selection.selectedNaicsCodes, 'selected NAICS codes must match fixture selection');
assertNoForbiddenDecisionLanguage(contract.fixedSelection.selectionBasis, 'fixedSelection selectionBasis');

assert(Array.isArray(contract.geographicReachLevels), 'geographicReachLevels must be an array');
assert.deepStrictEqual(
  contract.geographicReachLevels.map(function(level) { return level.id; }),
  EXPECTED_REACH_IDS,
  'geographicReachLevels must follow the documented five-level order'
);
contract.geographicReachLevels.forEach(function(level, index) {
  assert(isNonEmptyString(level.label), 'reach label is required at index ' + index);
  assert(isNonEmptyString(level.definition), 'reach definition is required at index ' + index);
  assertNoForbiddenDecisionLanguage(level.definition, 'reach definition at index ' + index);
});

assert(Array.isArray(contract.decisionLenses), 'decisionLenses must be an array');
assert.deepStrictEqual(
  contract.decisionLenses.map(function(lens) { return lens.id; }),
  EXPECTED_LENS_IDS,
  'decisionLenses must follow the documented seven-lens order'
);
contract.decisionLenses.forEach(function(lens, index) {
  assert.strictEqual(lens.order, index + 1, 'lens order mismatch at index ' + index);
  assert(isNonEmptyString(lens.label), 'lens label is required at index ' + index);
});

assert(Array.isArray(contract.scenarios), 'scenarios must be an array');
assert.deepStrictEqual(
  contract.scenarios.map(function(scenario) { return scenario.id; }),
  EXPECTED_SCENARIO_IDS,
  'scenario ids must match the documented three-scenario matrix'
);

contract.scenarios.forEach(function(scenario) {
  assert(isNonEmptyString(scenario.label), 'scenario label is required for ' + scenario.id);
  assert(scenario.businessProfile && typeof scenario.businessProfile === 'object', 'businessProfile is required for ' + scenario.id);
  ['currentTargetScale', 'customerReach', 'siteNeeds', 'workforcePattern', 'logisticsPattern'].forEach(function(field) {
    assert(isNonEmptyString(scenario.businessProfile[field]), 'businessProfile.' + field + ' is required for ' + scenario.id);
    assertNoForbiddenDecisionLanguage(scenario.businessProfile[field], scenario.id + ' businessProfile.' + field);
  });

  assert(Array.isArray(scenario.decisionLensAssessments), 'decisionLensAssessments must be an array for ' + scenario.id);
  assert.strictEqual(scenario.decisionLensAssessments.length, EXPECTED_LENS_IDS.length, 'scenario must include one assessment per lens: ' + scenario.id);

  EXPECTED_LENS_IDS.forEach(function(lensId) {
    var assessment = findAssessment(scenario, lensId);

    assert(assessment, 'missing lens assessment ' + lensId + ' for ' + scenario.id);
    assert(ALLOWED_RELEVANCE[assessment.relevance], 'invalid relevance for ' + scenario.id + ' ' + lensId);
    assert(ALLOWED_CRITICALITY[assessment.criticality], 'invalid criticality for ' + scenario.id + ' ' + lensId);
    assert(ALLOWED_CONFIDENCE[assessment.confidence], 'invalid confidence for ' + scenario.id + ' ' + lensId);
    assert(Array.isArray(assessment.facts) && assessment.facts.length >= 1, 'facts are required for ' + scenario.id + ' ' + lensId);
    assert(Array.isArray(assessment.limitations) && assessment.limitations.length >= 2, 'limitations are required for ' + scenario.id + ' ' + lensId);
    assert(isNonEmptyString(assessment.nextValidationCheck), 'nextValidationCheck is required for ' + scenario.id + ' ' + lensId);
    assertNoForbiddenDecisionLanguage(assessment.nextValidationCheck, scenario.id + ' ' + lensId + ' nextValidationCheck');

    assessment.facts.forEach(function(fact, index) {
      assert(isNonEmptyString(fact.id), 'fact id is required for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(isNonEmptyString(fact.signalId), 'fact signalId is required for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(signalIds[fact.signalId], 'fact signalId must exist in the decision-signal registry for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(isNonEmptyString(fact.label), 'fact label is required for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(EXPECTED_REACH_IDS.indexOf(fact.reachId) !== -1, 'fact reachId is invalid for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(ALLOWED_SOURCE_TYPES[fact.sourceType], 'fact sourceType is invalid for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assert(isNonEmptyString(fact.notes), 'fact notes are required for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assertNoForbiddenDecisionLanguage(fact.label, scenario.id + ' ' + lensId + ' fact label at index ' + index);
      assertNoForbiddenDecisionLanguage(fact.notes, scenario.id + ' ' + lensId + ' fact notes at index ' + index);

      if (fact.sourceType === 'registered-source') {
        assert(isNonEmptyString(fact.sourceId), 'registered-source fact must include sourceId for ' + scenario.id + ' ' + lensId + ' at index ' + index);
        assert(sourceIds[fact.sourceId], 'registered-source fact sourceId must exist in registry for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      } else {
        assert(!fact.sourceId, 'source-gap fact must not include sourceId for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      }
    });

    assessment.limitations.forEach(function(note, index) {
      assert(isNonEmptyString(note), 'limitation is required for ' + scenario.id + ' ' + lensId + ' at index ' + index);
      assertNoForbiddenDecisionLanguage(note, scenario.id + ' ' + lensId + ' limitation at index ' + index);
    });
  });
});

assert(Array.isArray(contract.expectedScenarioProgression), 'expectedScenarioProgression must be an array');
assert(contract.expectedScenarioProgression.length >= 1, 'expectedScenarioProgression must include at least one lens');

contract.expectedScenarioProgression.forEach(function(progress, index) {
  assert(EXPECTED_LENS_IDS.indexOf(progress.lensId) !== -1, 'invalid progression lensId at index ' + index);

  EXPECTED_SCENARIO_IDS.forEach(function(scenarioId) {
    var assessment = findAssessment(findScenario(scenarioId), progress.lensId);

    assert.strictEqual(assessment.relevance, progress.relevanceByScenario[scenarioId], 'progression relevance mismatch for ' + progress.lensId + ' ' + scenarioId);
    assert.strictEqual(assessment.criticality, progress.criticalityByScenario[scenarioId], 'progression criticality mismatch for ' + progress.lensId + ' ' + scenarioId);
    assert.strictEqual(assessment.facts[0].reachId, progress.reachByScenario[scenarioId], 'progression reach mismatch for ' + progress.lensId + ' ' + scenarioId);
  });
});
