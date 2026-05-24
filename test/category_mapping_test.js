'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var categories = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json'), 'utf8'));
var schemaMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-schema-map.json'), 'utf8'));
var confidence = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-provenance-confidence.json'), 'utf8'));

var expectedCategoryIds = [
  'clinic_health_service',
  'construction_service',
  'education_training',
  'lodging_tourism',
  'professional_services',
  'restaurant_cafe',
  'small_grocery',
  'software_service_office'
];

var allowedConfidence = {
  high: true,
  medium: true,
  low: true,
  unknown: true
};

var allowedStatus = {
  candidate: true,
  blocked: true
};

var allowedMatch = {
  primary: true,
  supporting: true
};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasCbpsMapping() {
  return schemaMapping.tables.some(function(tableMap) {
    return tableMap.table === 'cbps' && tableMap.status !== 'blocked';
  });
}

function hasCbpsAssessment() {
  return confidence.tableAssessments.some(function(assessment) {
    return assessment.table === 'cbps' && assessment.sourceBacked === true;
  });
}

assert.strictEqual(categories.schemaVersion, 1);
assert.strictEqual(categories.scope, 'puerto-rico-only');
assert.strictEqual(categories.sourceRegistry, 'data/sources/puerto-rico.json');
assert.strictEqual(categories.schemaMapping, 'data/mappings/puerto-rico-schema-map.json');
assert.strictEqual(categories.provenanceContract, 'data/mappings/puerto-rico-provenance-confidence.json');
assert.strictEqual(categories.naicsVersion, '2012');
assert.strictEqual(categories.status, 'draft-category-crosswalk');
assert(isNonEmptyString(categories.notes));
assert(Array.isArray(categories.requiredBeforePlanningEndpoint));
assert(categories.requiredBeforePlanningEndpoint.length > 0);
assert.strictEqual(hasCbpsMapping(), true, 'CBP schema mapping is required before category crosswalk use');
assert.strictEqual(hasCbpsAssessment(), true, 'CBP provenance assessment is required before category crosswalk use');

var seenCategories = {};
var seenNaics = {};

categories.categories.forEach(function(category) {
  assert(isNonEmptyString(category.id), 'category id is required');
  assert(/^[a-z0-9]+(_[a-z0-9]+){0,2}$/.test(category.id), category.id + ' must use concise snake_case');
  assert(isNonEmptyString(category.displayName), category.id + ' displayName is required');
  assert(isNonEmptyString(category.description), category.id + ' description is required');
  assert(Array.isArray(category.mappedNaics), category.id + ' mappedNaics must be an array');
  assert(category.mappedNaics.length > 0, category.id + ' must map at least one NAICS code');
  assert(Array.isArray(category.assumptions), category.id + ' assumptions must be an array');
  assert(category.assumptions.length > 0, category.id + ' assumptions are required');
  assert(allowedConfidence[category.confidence], category.id + ' confidence is invalid');
  assert(allowedStatus[category.status], category.id + ' status is invalid');
  assert(Array.isArray(category.limitations), category.id + ' limitations must be an array');
  assert(category.limitations.length > 0, category.id + ' limitations are required');

  var primaryMatches = 0;

  category.mappedNaics.forEach(function(naics) {
    assert(/^[0-9]{2,6}$/.test(naics.code), category.id + ' NAICS code must be 2 to 6 digits');
    assert(isNonEmptyString(naics.title), category.id + ' NAICS title is required');
    assert(allowedMatch[naics.match], category.id + ' NAICS match is invalid');

    if (naics.match === 'primary') {
      primaryMatches += 1;
    }

    seenNaics[naics.code] = true;
  });

  assert(primaryMatches > 0, category.id + ' needs at least one primary NAICS mapping');
  seenCategories[category.id] = true;
});

assert.deepStrictEqual(Object.keys(seenCategories).sort(), expectedCategoryIds);
assert(Object.keys(seenNaics).length >= expectedCategoryIds.length, 'starter crosswalk should cover multiple NAICS codes');
