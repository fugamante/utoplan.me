'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'anonymous-runtime-production-decision-contract.json'), 'utf8'));
var requiredFields = [
  'schemaVersion',
  'scope',
  'decisionStatus',
  'decisionBy',
  'decidedAt',
  'targetEnvironment',
  'targetOrigin',
  'hostingTopology',
  'runtimeGate',
  'migrationEvidence',
  'limiterEvidence',
  'proxyEvidence',
  'smokeEvidence',
  'backupRestoreEvidence',
  'rollbackEvidence',
  'acknowledgements'
];
var requiredAcknowledgements = [
  'Anonymous runtime activation may create production anonymous session/profile rows.',
  'Anonymous session/profile tables must not be dropped after production writes exist.',
  'The activation gate is the first rollback control.',
  'Shared or edge rate limiting is active before public traffic reaches anonymous routes.',
  'Trusted client IP handling was verified at the public app boundary.',
  'The opt-in anonymous release smoke passed against the candidate public app origin.',
  'This approval does not approve password accounts or production user authentication.'
];

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'anonymous-runtime-production');
assert.strictEqual(contract.contractStatus, 'draft-activation-decision');
assert.strictEqual(contract.artifactName, 'anonymousRuntimeProductionDecision');

requiredFields.forEach(function(field) {
  assert(contract.requiredFields.indexOf(field) !== -1, field + ' should be required');
  assert(contract.fieldRules[field], field + ' should have field rules');
});

assert.deepStrictEqual(contract.fieldRules.schemaVersion, {
  equals: 1
});
assert.deepStrictEqual(contract.fieldRules.scope, {
  equals: 'anonymous-runtime-production'
});
assert(contract.fieldRules.decisionStatus.allowedValues.indexOf('approved-for-activation') !== -1);
assert(contract.fieldRules.decisionStatus.allowedValues.indexOf('blocked') !== -1);
assert(contract.fieldRules.decisionBy.description.indexOf('avoid personal identifiers') !== -1);

[
  'apiPrivate',
  'postgresPrivate',
  'apiDirectPublicAccess',
  'sameOriginAppProxy'
].forEach(function(field) {
  assert(contract.fieldRules.hostingTopology.requiredFields.indexOf(field) !== -1);
});

[
  'UTOPLAN_ANONYMOUS_RUNTIME',
  'UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS',
  'UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE'
].forEach(function(field) {
  assert(contract.fieldRules.runtimeGate.requiredFields.indexOf(field) !== -1);
});

[
  'anonymousStorageMigrationApplied',
  'sharedLimiterMigrationApplied',
  'anonymousSchemaReady',
  'baselineReadyzUnchanged'
].forEach(function(field) {
  assert(contract.fieldRules.migrationEvidence.requiredFields.indexOf(field) !== -1);
});

[
  'mode',
  'attested',
  'scopeEvidence',
  'failClosedBehaviorReviewed'
].forEach(function(field) {
  assert(contract.fieldRules.limiterEvidence.requiredFields.indexOf(field) !== -1);
});

[
  'trustedClientIpVerified',
  'forwardingHeadersStripped',
  'attackerSuppliedHeaderSmokePassed'
].forEach(function(field) {
  assert(contract.fieldRules.proxyEvidence.requiredFields.indexOf(field) !== -1);
});

[
  'releaseSmokePassed',
  'anonymousSmokePassed',
  'negativeCorsCsrfChecksPassed'
].forEach(function(field) {
  assert(contract.fieldRules.smokeEvidence.requiredFields.indexOf(field) !== -1);
});

[
  'activationGateDisablement',
  'sharedOrEdgeLimiterFallback',
  'noDropAfterProductionWrites',
  'dataPreservingRollbackReviewed'
].forEach(function(field) {
  assert(contract.fieldRules.rollbackEvidence.requiredFields.indexOf(field) !== -1);
});

requiredAcknowledgements.forEach(function(acknowledgement) {
  assert(contract.requiredAcknowledgements.indexOf(acknowledgement) !== -1);
});

[
  'password',
  'token',
  'secret',
  'privateKey',
  'personalEmail',
  'DATABASE_URL',
  'cookie',
  'csrfToken',
  'sessionToken',
  'authorization',
  'setCookie',
  'clientIp',
  'rawEnv'
].forEach(function(field) {
  assert(contract.forbiddenFields.indexOf(field) !== -1);
});

assert.strictEqual(contract.retention.storeWithReleaseArtifact, true);
assert.strictEqual(contract.retention.includeInPublicRepo, false);
assert(contract.exclusions.indexOf('This decision package does not approve password accounts.') !== -1);
assert(contract.exclusions.indexOf('This decision package does not approve production user authentication.') !== -1);
