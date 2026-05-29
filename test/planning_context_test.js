'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var fixturePath = path.join(__dirname, '..', 'data', 'planning-context', 'mun001_construction.json');
var mappingPath = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');
var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');

var fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
var mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

var CONFIDENCE_LABELS = {
  low: true,
  medium: true,
  high: true
};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasForbiddenDecisionLanguage(value) {
  return /\b(score|rank|ranking|recommend|best|should choose|profitable|suitability)\b/i.test(value);
}

function assertNoForbiddenDecisionLanguage(value, label) {
  assert(!hasForbiddenDecisionLanguage(value), label + ' must stay descriptive');
}

function findCategory(id) {
  return mapping.categories.find(function(category) {
    return category.id === id;
  });
}

function toSourceIdSet(sources) {
  return sources.reduce(function(sourceIds, source) {
    sourceIds[source.id] = true;
    return sourceIds;
  }, {});
}

assert.strictEqual(fixture.schemaVersion, 1);
assert.strictEqual(fixture.scope, 'puerto-rico-planning-candidate');
assert.strictEqual(fixture.status, 'candidate-needs-review');
assert(isNonEmptyString(fixture.updatedAt), 'updatedAt is required');

assert(fixture.municipality && typeof fixture.municipality === 'object', 'municipality is required');
assert(/^[0-9]{3}$/.test(fixture.municipality.code), 'municipality.code must be a zero-padded three-digit code');
assert.strictEqual(fixture.municipality.codeSystem, 'fipscty');
assert(isNonEmptyString(fixture.municipality.label), 'municipality label is required');
assert(CONFIDENCE_LABELS[fixture.municipality.confidence], 'municipality confidence must be low, medium, or high');
assert(isNonEmptyString(fixture.municipality.notes), 'municipality notes are required');
assertNoForbiddenDecisionLanguage(fixture.municipality.notes, 'municipality notes');

assert(fixture.businessCategory && typeof fixture.businessCategory === 'object', 'businessCategory is required');
var mappedCategory = findCategory(fixture.businessCategory.id);
assert(mappedCategory, 'businessCategory.id must match an entry in the category mapping');
assert.strictEqual(fixture.businessCategory.displayName, mappedCategory.displayName, 'businessCategory displayName must align with mapping');
assert.strictEqual(fixture.businessCategory.naicsYear, mappedCategory.naicsYear, 'businessCategory naicsYear must align with mapping');
assert.deepStrictEqual(fixture.businessCategory.naicsCodes, mappedCategory.naicsCodes, 'businessCategory naicsCodes must align with mapping');
assert(CONFIDENCE_LABELS[fixture.businessCategory.confidence], 'businessCategory confidence must be low, medium, or high');
assert(isNonEmptyString(fixture.businessCategory.status), 'businessCategory status is required');

assert(fixture.selection && typeof fixture.selection === 'object', 'selection is required');
assert.strictEqual(fixture.selection.municipalityCode, fixture.municipality.code, 'selection municipality must match fixture municipality');
assert.strictEqual(fixture.selection.municipalityCodeField, 'fipscty');
assert(Array.isArray(fixture.selection.selectedNaicsCodes), 'selection.selectedNaicsCodes must be an array');
assert(fixture.selection.selectedNaicsCodes.length > 0, 'selection must include at least one selected NAICS code');
assert(isNonEmptyString(fixture.selection.matchRule), 'selection matchRule is required');
assert(isNonEmptyString(fixture.selection.selectionBasis), 'selection basis is required');
assertNoForbiddenDecisionLanguage(fixture.selection.selectionBasis, 'selection basis');

fixture.selection.selectedNaicsCodes.forEach(function(code) {
  assert(/^[0-9]{6}$/.test(code), 'selected NAICS code must be six digits');
  assert(mappedCategory.naicsCodes.indexOf(code) !== -1, 'selected NAICS code must be in the mapped category');
});

assert(Array.isArray(fixture.cbpFacts), 'cbpFacts must be an array');
assert(fixture.cbpFacts.length >= 1, 'cbpFacts must include at least one matching fact row');

fixture.cbpFacts.forEach(function(fact, index) {
  assert(fact && typeof fact === 'object', 'cbp fact must be an object at index ' + index);
  assert.strictEqual(fact.municipalityCode, fixture.municipality.code, 'fact municipality code must match fixture municipality');
  assert(fixture.selection.selectedNaicsCodes.indexOf(fact.naics) !== -1, 'fact NAICS must be selected in fixture selection');
  assert(Number.isInteger(fact.establishments) && fact.establishments >= 0, 'fact establishments must be a non-negative integer');
  assert(typeof fact.annualPayroll === 'number' && fact.annualPayroll >= 0, 'fact annualPayroll must be a non-negative number');
  assert(typeof fact.employment === 'number' && fact.employment >= 0, 'fact employment must be a non-negative number');
  assert(CONFIDENCE_LABELS[fact.confidence], 'fact confidence must be low, medium, or high');
  assert(isNonEmptyString(fact.notes), 'fact notes are required');
  assertNoForbiddenDecisionLanguage(fact.notes, 'fact notes');

  assert(fact.sourceRow && typeof fact.sourceRow === 'object', 'fact sourceRow is required');
  assert.strictEqual(fact.sourceRow.fipscty, String(parseInt(fixture.municipality.code, 10)), 'source row fipscty must match municipality code');
  assert.strictEqual(fact.sourceRow.naics, fact.naics, 'source row NAICS must match selected fact NAICS');
});

assert(Array.isArray(fixture.sourceMetadata), 'sourceMetadata must be an array');
assert(fixture.sourceMetadata.length >= 1, 'sourceMetadata must contain at least one entry');

var sourceIds = toSourceIdSet(registry.sources);

fixture.sourceMetadata.forEach(function(source, index) {
  assert(source && typeof source === 'object', 'source metadata must be an object at index ' + index);
  assert(isNonEmptyString(source.sourceId), 'sourceId is required at index ' + index);
  assert(sourceIds[source.sourceId], 'sourceId must exist in data source registry: ' + source.sourceId);
  assert(isNonEmptyString(source.publisher), 'source publisher is required for ' + source.sourceId);
  assert(isNonEmptyString(source.portal), 'source portal is required for ' + source.sourceId);
  assert(isNonEmptyString(source.license), 'source license is required for ' + source.sourceId);
  assert(isNonEmptyString(source.retrievedAt), 'source retrievedAt is required for ' + source.sourceId);
  assert(Array.isArray(source.targetTables), 'source targetTables must be an array for ' + source.sourceId);
  assert(source.targetTables.length > 0, 'source targetTables must include at least one table for ' + source.sourceId);

  assert(source.legacySchemaCoverage && typeof source.legacySchemaCoverage === 'object', 'legacySchemaCoverage is required for ' + source.sourceId);
  ['cnaic', 'total_anual', 'num_est', 'county', 'total_indus', 'cnaic_name'].forEach(function(column) {
    assert(isNonEmptyString(source.legacySchemaCoverage[column]), 'legacySchemaCoverage must include ' + column + ' for ' + source.sourceId);
  });
});

assert(fixture.confidence && typeof fixture.confidence === 'object', 'confidence is required');
assert(CONFIDENCE_LABELS[fixture.confidence.category], 'confidence.category must be low, medium, or high');
assert(CONFIDENCE_LABELS[fixture.confidence.factSelection], 'confidence.factSelection must be low, medium, or high');
assert(CONFIDENCE_LABELS[fixture.confidence.factValues], 'confidence.factValues must be low, medium, or high');
assert(CONFIDENCE_LABELS[fixture.confidence.overall], 'confidence.overall must be low, medium, or high');
assert(Array.isArray(fixture.confidence.rationale), 'confidence.rationale must be an array');
assert(fixture.confidence.rationale.length >= 2, 'confidence.rationale must include at least two notes');

fixture.confidence.rationale.forEach(function(note, index) {
  assert(isNonEmptyString(note), 'confidence rationale note must be non-empty at index ' + index);
  assertNoForbiddenDecisionLanguage(note, 'confidence rationale note');
});

assert(Array.isArray(fixture.limitations), 'limitations must be an array');
assert(fixture.limitations.length >= 2, 'limitations must include at least two notes');
fixture.limitations.forEach(function(note, index) {
  assert(isNonEmptyString(note), 'limitations note must be non-empty at index ' + index);
  assertNoForbiddenDecisionLanguage(note, 'limitations note');
});

assert(Array.isArray(fixture.unresolvedQuestions), 'unresolvedQuestions must be an array');
assert(fixture.unresolvedQuestions.length >= 2, 'unresolvedQuestions must include at least two questions');
fixture.unresolvedQuestions.forEach(function(question, index) {
  assert(isNonEmptyString(question), 'unresolved question must be non-empty at index ' + index);
  assertNoForbiddenDecisionLanguage(question, 'unresolved question');
});
