'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-operator-approval-contract.json'), 'utf8'));
var requiredFields = [
  'schemaVersion',
  'scope',
  'approvedBy',
  'approvedAt',
  'approvalReason',
  'skippedAcknowledged',
  'skippedSummary',
  'sourceArtifacts',
  'acknowledgements'
];
var requiredAcknowledgements = [
  'Rejected records will not be written.',
  'Manual-review records will not be written.',
  'Unsupported cached sources will not be written.',
  'Skipped counts were reviewed against the SQL preview summary.',
  'This approval does not enable database mutation by itself.'
];

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'puerto-rico-only');
assert.strictEqual(contract.contractStatus, 'draft-no-writer');
assert.strictEqual(contract.artifactName, 'operatorApproval');

requiredFields.forEach(function(field) {
  assert(contract.requiredFields.indexOf(field) !== -1, field + ' should be required');
  assert(contract.fieldRules[field], field + ' should have a field rule');
});

assert.deepStrictEqual(contract.fieldRules.schemaVersion, {
  equals: 1
});
assert.deepStrictEqual(contract.fieldRules.scope, {
  equals: 'puerto-rico-only'
});
assert.deepStrictEqual(contract.fieldRules.skippedAcknowledged, {
  equals: true
});
assert.strictEqual(contract.fieldRules.approvedBy.description.indexOf('avoid personal identifiers') !== -1, true);
assert.strictEqual(contract.fieldRules.skippedSummary.valueSource, 'sqlPreview.summary.skipped');
assert.strictEqual(contract.fieldRules.acknowledgements.valueSource, 'requiredAcknowledgements');

[
  'rejected',
  'manualReview',
  'unsupportedCacheSources'
].forEach(function(field) {
  assert(contract.fieldRules.skippedSummary.requiredFields.indexOf(field) !== -1);
});

[
  'loadPlanGeneratedAt',
  'sqlPreviewGeneratedAt',
  'writerGateSchemaVersion'
].forEach(function(field) {
  assert(contract.fieldRules.sourceArtifacts.requiredFields.indexOf(field) !== -1);
});

requiredAcknowledgements.forEach(function(acknowledgement) {
  assert(contract.requiredAcknowledgements.indexOf(acknowledgement) !== -1);
});
assert(contract.requiredFields.indexOf('acknowledgements') !== -1);

[
  'password',
  'token',
  'secret',
  'privateKey',
  'personalEmail'
].forEach(function(field) {
  assert(contract.forbiddenFields.indexOf(field) !== -1);
});

assert.strictEqual(contract.retention.storeWithReleaseArtifact, true);
assert.strictEqual(contract.retention.includeInPublicRepo, false);
