'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var contract = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-adjacent-planning-contract.json'), 'utf8'));
var blockedReview = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-blocked-source-review.json'), 'utf8'));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'puerto-rico-adjacent-planning');
assert.strictEqual(contract.blockedSourceReview, 'data/mappings/puerto-rico-blocked-source-review.json');
assert.strictEqual(blockedReview.decision, 'keep-blocked');
assert.strictEqual(contract.status, 'contract-only');
assert.strictEqual(contract.legacyImportAllowed, false);
assert.strictEqual(contract.scoringAllowed, false);
assert.strictEqual(contract.recommendationsAllowed, false);
assert.strictEqual(contract.productionUseAllowed, false);
assert(Array.isArray(contract.allowedUses));
assert(Array.isArray(contract.forbiddenUses));
assert(contract.forbiddenUses.indexOf('populate cdepts, businesses, or grade_cs') !== -1);
assert(contract.forbiddenUses.indexOf('import person-level contact fields') !== -1);
assert(Array.isArray(contract.candidateFamilies));
assert.strictEqual(contract.candidateFamilies.length, 3);
assert(Array.isArray(contract.candidateSourceFields));
[
  'candidateId',
  'sourceUrl',
  'puertoRicoScope',
  'missingForLegacyUse',
  'privacyNotes',
  'licenseNotes',
  'mustNotInfer'
].forEach(function(field) {
  assert(contract.candidateSourceFields.indexOf(field) !== -1, field + ' must be required for candidate sources');
});
assert(Array.isArray(contract.requiredValidationRules));
assert(contract.requiredValidationRules.some(function(rule) {
  return rule.indexOf('importEnabled true') !== -1;
}));
assert(contract.requiredValidationRules.some(function(rule) {
  return rule.indexOf('sourceBackedLegacyTable true') !== -1;
}));

contract.candidateFamilies.forEach(function(family) {
  assert(isNonEmptyString(family.id), 'family id is required');
  assert(Array.isArray(family.sourceTypes), family.id + ' sourceTypes must be an array');
  assert(family.sourceTypes.length > 0, family.id + ' sourceTypes are required');
  assert(Array.isArray(family.allowedPlanningFields), family.id + ' allowedPlanningFields must be an array');
  assert(family.allowedPlanningFields.every(isNonEmptyString), family.id + ' fields must be named');
  assert(Array.isArray(family.requiredBoundaries), family.id + ' requiredBoundaries must be an array');
  assert(family.requiredBoundaries.length > 0, family.id + ' boundaries are required');
});

assert(contract.candidateFamilies.some(function(family) {
  return family.id === 'business-registry-context' &&
    family.requiredBoundaries.some(function(boundary) {
      return boundary.indexOf('officer') !== -1 && boundary.indexOf('email') !== -1;
    });
}));

assert(Array.isArray(contract.promotionRequirements));
assert(contract.promotionRequirements.some(function(requirement) {
  return requirement.indexOf('planning-specific schema') !== -1;
}));
