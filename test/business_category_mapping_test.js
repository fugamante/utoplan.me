'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var mappingPath = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');
var mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isNaicsCode(value) {
  return /^[0-9]{2,6}$/.test(value);
}

function hasForbiddenDecisionLanguage(value) {
  return /\b(score|rank|ranking|recommend|best|should choose|profit|profitable)\b/i.test(value);
}

function assertNoForbiddenLanguage(value, label) {
  assert(!hasForbiddenDecisionLanguage(value), label + ' must stay descriptive');
}

assert.strictEqual(mapping.schemaVersion, 1);
assert.strictEqual(mapping.scope, 'puerto-rico-planning-candidate');
assert.strictEqual(mapping.status, 'candidate-needs-review');
assert(isNonEmptyString(mapping.sourceBasis));
assert(isNonEmptyString(mapping.updatedAt));
assert(mapping.rules && typeof mapping.rules === 'object');
assert.strictEqual(mapping.rules.noScores, true);
assert.strictEqual(mapping.rules.noRankings, true);
assert.strictEqual(mapping.rules.requiresHumanReviewBeforeProduction, true);
assert.strictEqual(mapping.rules.requiresSourceBackedFacts, true);

assert(Array.isArray(mapping.categories));
assert(mapping.categories.length >= 8);

var ids = {};

mapping.categories.forEach(function(category) {
  assert(isSlug(category.id), 'category id must be a stable slug');
  assert(!ids[category.id], 'category id must be unique: ' + category.id);
  ids[category.id] = true;

  assert(isNonEmptyString(category.displayName), category.id + ' displayName is required');
  assert(isNonEmptyString(category.description), category.id + ' description is required');
  assert.strictEqual(category.naicsYear, 2012, category.id + ' must use the current CBP NAICS year');
  assert(Array.isArray(category.naicsCodes), category.id + ' naicsCodes must be an array');
  assert(category.naicsCodes.length > 0, category.id + ' must include at least one NAICS code');
  assert(Array.isArray(category.assumptions), category.id + ' assumptions must be an array');
  assert(category.assumptions.length >= 2, category.id + ' must document assumptions and limits');
  assert(isNonEmptyString(category.confidence), category.id + ' confidence is required');
  assert(isNonEmptyString(category.status), category.id + ' status is required');

  category.naicsCodes.forEach(function(code) {
    assert(isNaicsCode(code), category.id + ' has invalid NAICS code: ' + code);
  });

  assertNoForbiddenLanguage(category.description, category.id + ' description');
  category.assumptions.forEach(function(assumption) {
    assert(isNonEmptyString(assumption), category.id + ' assumption is required');
    assertNoForbiddenLanguage(assumption, category.id + ' assumption');
  });
});
