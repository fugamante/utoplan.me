'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var fixturesDir = path.join(__dirname, '..', 'data', 'planning-context');
var mappingPath = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');
var municipalityRegistryPath = path.join(__dirname, '..', 'data', 'municipalities', 'planning-context-municipalities.json');
var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');

var mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
var municipalityRegistry = JSON.parse(fs.readFileSync(municipalityRegistryPath, 'utf8'));
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

var fixtureFiles = fs.readdirSync(fixturesDir).filter(function(file) {
  return file.endsWith('.json');
}).sort();

var fixtures = fixtureFiles.map(function(file) {
  return {
    file: file,
    data: JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'))
  };
});

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

function toMunicipalityNameMap(entries) {
  return entries.reduce(function(result, entry) {
    result[entry.code] = entry.name;
    return result;
  }, {});
}

function assertCoverage(source, label) {
  assert(source.legacySchemaCoverage && typeof source.legacySchemaCoverage === 'object', 'legacySchemaCoverage is required for ' + label);
  ['cnaic', 'total_anual', 'num_est', 'county', 'total_indus', 'cnaic_name'].forEach(function(column) {
    assert(isNonEmptyString(source.legacySchemaCoverage[column]), 'legacySchemaCoverage must include ' + column + ' for ' + label);
  });
}

function assertFixture(fixture, file, sourceIds, municipalityNames) {
  var label = file + ': ';

  assert.strictEqual(fixture.schemaVersion, 1, label + 'schemaVersion must be 1');
  assert.strictEqual(fixture.scope, 'puerto-rico-planning-candidate', label + 'scope mismatch');
  assert.strictEqual(fixture.status, 'candidate-needs-review', label + 'status mismatch');
  assert(isNonEmptyString(fixture.updatedAt), label + 'updatedAt is required');

  assert(fixture.municipality && typeof fixture.municipality === 'object', label + 'municipality is required');
  assert(/^[0-9]{3}$/.test(fixture.municipality.code), label + 'municipality.code must be a zero-padded three-digit code');
  assert.strictEqual(fixture.municipality.codeSystem, 'fipscty', label + 'municipality codeSystem mismatch');
  assert(isNonEmptyString(fixture.municipality.label), label + 'municipality label is required');
  assert.strictEqual(fixture.municipality.label, municipalityNames[fixture.municipality.code], label + 'municipality label must match the planning-context municipality registry');
  assert(CONFIDENCE_LABELS[fixture.municipality.confidence], label + 'municipality confidence must be low, medium, or high');
  assert(isNonEmptyString(fixture.municipality.notes), label + 'municipality notes are required');
  assertNoForbiddenDecisionLanguage(fixture.municipality.notes, label + 'municipality notes');

  assert(fixture.businessCategory && typeof fixture.businessCategory === 'object', label + 'businessCategory is required');
  var mappedCategory = findCategory(fixture.businessCategory.id);
  assert(mappedCategory, label + 'businessCategory.id must match an entry in the category mapping');
  assert.strictEqual(fixture.businessCategory.displayName, mappedCategory.displayName, label + 'businessCategory displayName must align with mapping');
  assert.strictEqual(fixture.businessCategory.naicsYear, mappedCategory.naicsYear, label + 'businessCategory naicsYear must align with mapping');
  assert.deepStrictEqual(fixture.businessCategory.naicsCodes, mappedCategory.naicsCodes, label + 'businessCategory naicsCodes must align with mapping');
  assert(CONFIDENCE_LABELS[fixture.businessCategory.confidence], label + 'businessCategory confidence must be low, medium, or high');
  assert(isNonEmptyString(fixture.businessCategory.status), label + 'businessCategory status is required');

  assert(fixture.selection && typeof fixture.selection === 'object', label + 'selection is required');
  assert.strictEqual(fixture.selection.municipalityCode, fixture.municipality.code, label + 'selection municipality must match fixture municipality');
  assert.strictEqual(fixture.selection.municipalityCodeField, 'fipscty', label + 'selection municipalityCodeField mismatch');
  assert(Array.isArray(fixture.selection.selectedNaicsCodes), label + 'selection.selectedNaicsCodes must be an array');
  assert(fixture.selection.selectedNaicsCodes.length > 0, label + 'selection must include at least one selected NAICS code');
  assert(isNonEmptyString(fixture.selection.matchRule), label + 'selection matchRule is required');
  assert(isNonEmptyString(fixture.selection.selectionBasis), label + 'selection basis is required');
  assertNoForbiddenDecisionLanguage(fixture.selection.selectionBasis, label + 'selection basis');

  fixture.selection.selectedNaicsCodes.forEach(function(code) {
    assert(/^[0-9]{6}$/.test(code), label + 'selected NAICS code must be six digits');
    assert(mappedCategory.naicsCodes.indexOf(code) !== -1, label + 'selected NAICS code must be in the mapped category');
  });

  assert(Array.isArray(fixture.cbpFacts), label + 'cbpFacts must be an array');
  assert(fixture.cbpFacts.length >= 1, label + 'cbpFacts must include at least one matching fact row');

  fixture.cbpFacts.forEach(function(fact, index) {
    assert(fact && typeof fact === 'object', label + 'cbp fact must be an object at index ' + index);
    assert.strictEqual(fact.municipalityCode, fixture.municipality.code, label + 'fact municipality code must match fixture municipality');
    assert(fixture.selection.selectedNaicsCodes.indexOf(fact.naics) !== -1, label + 'fact NAICS must be selected in fixture selection');
    assert(Number.isInteger(fact.establishments) && fact.establishments >= 0, label + 'fact establishments must be a non-negative integer');
    assert(typeof fact.annualPayroll === 'number' && fact.annualPayroll >= 0, label + 'fact annualPayroll must be a non-negative number');
    assert(typeof fact.employment === 'number' && fact.employment >= 0, label + 'fact employment must be a non-negative number');
    assert(CONFIDENCE_LABELS[fact.confidence], label + 'fact confidence must be low, medium, or high');
    assert(isNonEmptyString(fact.notes), label + 'fact notes are required');
    assertNoForbiddenDecisionLanguage(fact.notes, label + 'fact notes');

    assert(fact.sourceRow && typeof fact.sourceRow === 'object', label + 'fact sourceRow is required');
    assert.strictEqual(fact.sourceRow.fipscty, String(parseInt(fixture.municipality.code, 10)), label + 'source row fipscty must match municipality code');
    assert.strictEqual(fact.sourceRow.naics, fact.naics, label + 'source row NAICS must match selected fact NAICS');
  });

  assert(Array.isArray(fixture.sourceMetadata), label + 'sourceMetadata must be an array');
  assert(fixture.sourceMetadata.length >= 1, label + 'sourceMetadata must contain at least one entry');

  fixture.sourceMetadata.forEach(function(source, index) {
    var sourceLabel = label + 'sourceMetadata[' + index + ']';
    assert(source && typeof source === 'object', sourceLabel + ' must be an object');
    assert(isNonEmptyString(source.sourceId), sourceLabel + ' sourceId is required');
    assert(sourceIds[source.sourceId], sourceLabel + ' sourceId must exist in data source registry: ' + source.sourceId);
    assert(isNonEmptyString(source.publisher), sourceLabel + ' publisher is required');
    assert(isNonEmptyString(source.portal), sourceLabel + ' portal is required');
    assert(isNonEmptyString(source.license), sourceLabel + ' license is required');
    assert(isNonEmptyString(source.retrievedAt), sourceLabel + ' retrievedAt is required');
    assert(Array.isArray(source.targetTables), sourceLabel + ' targetTables must be an array');
    assert(source.targetTables.length > 0, sourceLabel + ' targetTables must include at least one table');
    assertCoverage(source, sourceLabel);
  });

  assert(fixture.confidence && typeof fixture.confidence === 'object', label + 'confidence is required');
  assert(CONFIDENCE_LABELS[fixture.confidence.category], label + 'confidence.category must be low, medium, or high');
  assert(CONFIDENCE_LABELS[fixture.confidence.factSelection], label + 'confidence.factSelection must be low, medium, or high');
  assert(CONFIDENCE_LABELS[fixture.confidence.factValues], label + 'confidence.factValues must be low, medium, or high');
  assert(CONFIDENCE_LABELS[fixture.confidence.overall], label + 'confidence.overall must be low, medium, or high');
  assert(Array.isArray(fixture.confidence.rationale), label + 'confidence.rationale must be an array');
  assert(fixture.confidence.rationale.length >= 2, label + 'confidence.rationale must include at least two notes');

  fixture.confidence.rationale.forEach(function(note, index) {
    assert(isNonEmptyString(note), label + 'confidence rationale note must be non-empty at index ' + index);
    assertNoForbiddenDecisionLanguage(note, label + 'confidence rationale note');
  });

  assert(Array.isArray(fixture.limitations), label + 'limitations must be an array');
  assert(fixture.limitations.length >= 2, label + 'limitations must include at least two notes');
  fixture.limitations.forEach(function(note, index) {
    assert(isNonEmptyString(note), label + 'limitations note must be non-empty at index ' + index);
    assertNoForbiddenDecisionLanguage(note, label + 'limitations note');
  });

  assert(Array.isArray(fixture.unresolvedQuestions), label + 'unresolvedQuestions must be an array');
  assert(fixture.unresolvedQuestions.length >= 2, label + 'unresolvedQuestions must include at least two questions');
  fixture.unresolvedQuestions.forEach(function(question, index) {
    assert(isNonEmptyString(question), label + 'unresolved question must be non-empty at index ' + index);
    assertNoForbiddenDecisionLanguage(question, label + 'unresolved question');
  });
}

assert(fixtures.length >= 2, 'planning-context should include at least two fixtures for cross-slice comparison');

var sourceIds = toSourceIdSet(registry.sources);
var municipalityNames = toMunicipalityNameMap(municipalityRegistry.entries);
var municipalityCodes = {};
var categoryIds = {};
var pairKeys = {};

fixtures.forEach(function(entry) {
  assertFixture(entry.data, entry.file, sourceIds, municipalityNames);

  var municipalityCode = entry.data.municipality.code;
  var categoryId = entry.data.businessCategory.id;
  var pairKey = municipalityCode + ':' + categoryId;

  municipalityCodes[municipalityCode] = true;
  categoryIds[categoryId] = true;
  assert(!pairKeys[pairKey], 'duplicate planning-context municipality/category pair: ' + pairKey);
  pairKeys[pairKey] = true;
});

assert(Object.keys(municipalityCodes).length >= 2, 'planning-context fixtures must cover at least two municipalities');
assert(Object.keys(categoryIds).length >= 2, 'planning-context fixtures must cover at least two business categories');
