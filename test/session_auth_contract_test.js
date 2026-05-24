'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-session-auth-contract.json'), 'utf8'));
var docs = fs.readFileSync(path.join(root, 'docs', 'session-auth-contract.md'), 'utf8');
var runtimeSequence = fs.readFileSync(path.join(root, 'docs', 'anonymous-session-runtime-sequence.md'), 'utf8');
var currentModes = {};
var proposedTables = {};
var anonymousProposedTables = {};
var endpointPlan = {};
var anonymousEndpoints = {};

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'puerto-rico-only');
assert.strictEqual(contract.contractStatus, 'draft-no-production-auth');
assert.strictEqual(contract.implementationStatus, 'blocked-pending-design');

contract.currentAllowedModes.forEach(function(mode) {
  currentModes[mode] = true;
});
assert.strictEqual(currentModes['browser-local-profile'], true);
assert.strictEqual(currentModes['demo-db-session'], true);
assert.strictEqual(contract.migrationArtifacts.indexOf('db/migrations/202605241000_reserve_session_profile_tables.md') !== -1, true);
assert.strictEqual(contract.migrationArtifacts.indexOf('db/migrations/202605241100_reserve_anonymous_session_profile_tables.md') !== -1, true);
assert.strictEqual(contract.anonymousApiContract.contractStatus, 'draft-no-runtime');
assert.strictEqual(contract.anonymousApiContract.schemaStatus, 'reserved-migration-artifact-ready');
assert.strictEqual(contract.anonymousApiContract.runtimeSequenceDocument, 'docs/anonymous-session-runtime-sequence.md');
assert.strictEqual(contract.anonymousApiContract.ownershipModel, 'caller-owned-anonymous-session');
assert.strictEqual(contract.anonymousApiContract.storageModel.reservedMigrationRequired, true);
assert.strictEqual(contract.anonymousApiContract.storageModel.migrationArtifact, 'db/migrations/202605241100_reserve_anonymous_session_profile_tables.md');
assert.strictEqual(contract.anonymousApiContract.storageModel.migrationArtifactStatus, 'review-ready-not-applied');
assert(contract.anonymousApiContract.storageModel.doNotUseTables.indexOf('demo_sessions') !== -1);
assert(contract.anonymousApiContract.storageModel.doNotUseTables.indexOf('user_accounts') !== -1);
assert(contract.anonymousApiContract.storageModel.requiredFutureTables.indexOf('anonymous_sessions') !== -1);
assert(contract.anonymousApiContract.storageModel.requiredFutureTables.indexOf('anonymous_planning_profiles') !== -1);
assert(contract.anonymousApiContract.storageModel.requiredFutureTables.indexOf('anonymous_profile_events') !== -1);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.transport, 'HttpOnly Secure SameSite=Lax cookie');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.cookie.name, 'utoplan_anon_session');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.cookie.domain, 'omit');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.cookie.maxAgeHours, 24);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.storage, 'hash-only');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.csrfProtection, 'required-for-mutating-methods');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.cors, 'same-origin-only-for-profile-routes');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.corsPolicy.profileRoutesAllowWildcardOrigin, false);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.corsPolicy.requireExplicitOriginAllowlist, true);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.corsPolicy.setVaryOriginWhenAllowed, true);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.corsPolicy.denyInvalidOriginPreflight, true);
assert(contract.anonymousApiContract.tokenPolicy.csrfPolicy.sessionCreationProtection.indexOf('no CSRF header is required') !== -1);
assert(contract.anonymousApiContract.tokenPolicy.csrfPolicy.responseDelivery.indexOf('return csrfToken once') !== -1);
assert.deepStrictEqual(contract.anonymousApiContract.tokenPolicy.csrfPolicy.requiredAfterBootstrapMethods, [
  'PUT',
  'DELETE'
]);
assert(contract.anonymousApiContract.tokenPolicy.csrfPolicy.requiredChecks.indexOf('same-origin Origin or Referer validation') !== -1);
assert(contract.anonymousApiContract.tokenPolicy.csrfPolicy.requiredChecks.indexOf('X-CSRF-Token header presence before parsing') !== -1);
assert(contract.anonymousApiContract.tokenPolicy.csrfPolicy.requiredChecks.indexOf('X-CSRF-Token hash matches the resolved anonymous session before mutation') !== -1);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.csrfPolicy.failureStatus, 403);
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.csrfPolicy.rotation, 'rotate on anonymous session creation and invalidate on session revoke');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.rateLimitPolicy.preAuthKey, 'client ip plus normalized origin');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.rateLimitPolicy.sessionKey, 'anonymous session public id after authentication');
assert.strictEqual(contract.anonymousApiContract.tokenPolicy.rateLimitPolicy.failureStatus, 429);
assert.strictEqual(contract.anonymousApiContract.profileSchema.maxBodyBytes, 2048);
assert.strictEqual(contract.anonymousApiContract.profileSchema.unknownFields, 'reject');
assert.deepStrictEqual(contract.anonymousApiContract.profileSchema.fields, [
  'businessIdea',
  'selectedMunicipalityId',
  'selectedCategoryId'
]);

contract.anonymousApiContract.endpoints.forEach(function(endpoint) {
  anonymousEndpoints[endpoint.method + ' ' + endpoint.path] = endpoint;
  assert.strictEqual(endpoint.status, 'reserved-not-implemented');
});
assert.strictEqual(anonymousEndpoints['POST /v1/anonymous-sessions'].successStatus, 201);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].existingCookieRule.indexOf('newly generated server token') !== -1);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].responseFields.indexOf('session.publicId') !== -1);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].responseFields.indexOf('csrfToken') !== -1);
assert.strictEqual(anonymousEndpoints['POST /v1/anonymous-sessions'].responseFields.indexOf('session.token'), -1);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].failureStatuses.indexOf(403) !== -1);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].failureStatuses.indexOf(413) !== -1);
assert(anonymousEndpoints['POST /v1/anonymous-sessions'].failureStatuses.indexOf(422) !== -1);
assert.strictEqual(anonymousEndpoints['GET /v1/profile'].requiresAuthenticatedSession, true);
assert(anonymousEndpoints['GET /v1/profile'].ownershipInvariant.indexOf('not expired or revoked') !== -1);
assert.strictEqual(anonymousEndpoints['PUT /v1/profile'].requiresAuthenticatedSession, true);
assert(anonymousEndpoints['PUT /v1/profile'].concurrencyRule.indexOf('row_version = expected') !== -1);
assert(anonymousEndpoints['PUT /v1/profile'].concurrencyRule.indexOf('anonymous_session_id = caller_session_id') !== -1);
assert(anonymousEndpoints['PUT /v1/profile'].failureStatuses.indexOf(409) !== -1);
assert(anonymousEndpoints['PUT /v1/profile'].failureStatuses.indexOf(403) !== -1);
assert.strictEqual(anonymousEndpoints['DELETE /v1/profile'].successStatus, 204);
assert(anonymousEndpoints['DELETE /v1/profile'].failureStatuses.indexOf(403) !== -1);
assert(anonymousEndpoints['DELETE /v1/profile'].ownershipInvariant.indexOf('profile is not deleted') !== -1);
assert(anonymousEndpoints['DELETE /v1/profile'].deleteRule.indexOf('deleted_at IS NULL') !== -1);
assert.strictEqual(contract.anonymousApiContract.errorContract['403'], 'csrf_or_origin_rejected');
assert.strictEqual(contract.anonymousApiContract.errorContract['409'], 'version_conflict');
assert.strictEqual(contract.anonymousApiContract.errorContract['422'], 'invalid_profile');

[
  'password storage requirements',
  'session token requirements',
  'profile data classification',
  'rate limits',
  'audit events',
  'migration and rollback artifacts'
].forEach(function(fragment) {
  assert(contract.requiredBeforeProductionAuth.some(function(item) {
    return item.indexOf(fragment) !== -1;
  }), fragment + ' should be required before production auth');
});

assert.deepStrictEqual(contract.allowedProfileFields.map(function(field) {
  return field.name;
}), [
  'businessIdea',
  'selectedMunicipalityId',
  'selectedCategoryId'
]);
assert.strictEqual(contract.allowedProfileFields[0].maxLength, 160);

contract.proposedTables.forEach(function(table) {
  proposedTables[table.name] = table;
  assert.strictEqual(table.status, 'reserved-not-implemented');
});

[
  'user_accounts',
  'user_sessions',
  'planning_profiles'
].forEach(function(name) {
  assert(proposedTables[name], name + ' should be reserved');
});
assert(proposedTables.profile_events, 'profile_events should be reserved');

[
  'password_hash',
  'password_algorithm'
].forEach(function(column) {
  assert(proposedTables.user_accounts.minimumColumns.indexOf(column) !== -1);
});
assert(proposedTables.user_sessions.minimumColumns.indexOf('token_hash') !== -1);
assert(proposedTables.planning_profiles.minimumColumns.indexOf('deleted_at') !== -1);

contract.anonymousProposedTables.forEach(function(table) {
  anonymousProposedTables[table.name] = table;
  assert.strictEqual(table.status, 'reserved-not-implemented');
});

[
  'anonymous_sessions',
  'anonymous_planning_profiles',
  'anonymous_profile_events'
].forEach(function(name) {
  assert(anonymousProposedTables[name], name + ' should be reserved');
});
assert(anonymousProposedTables.anonymous_sessions.minimumColumns.indexOf('token_hash') !== -1);
assert(anonymousProposedTables.anonymous_sessions.minimumColumns.indexOf('csrf_token_hash') !== -1);
assert(anonymousProposedTables.anonymous_sessions.minimumColumns.indexOf('revoke_reason') !== -1);
assert(anonymousProposedTables.anonymous_planning_profiles.minimumColumns.indexOf('anonymous_session_id') !== -1);
assert(anonymousProposedTables.anonymous_planning_profiles.minimumColumns.indexOf('row_version') !== -1);
assert(anonymousProposedTables.anonymous_planning_profiles.minimumColumns.indexOf('deleted_at') !== -1);
assert(anonymousProposedTables.anonymous_planning_profiles.minimumColumns.indexOf('deletion_requested_at') !== -1);
assert(anonymousProposedTables.anonymous_planning_profiles.minimumColumns.indexOf('export_requested_at') !== -1);
assert(anonymousProposedTables.anonymous_profile_events.minimumColumns.indexOf('anonymous_profile_id') !== -1);

contract.endpointPlan.forEach(function(endpoint) {
  endpointPlan[endpoint.method + ' ' + endpoint.path] = endpoint;
  assert.strictEqual(endpoint.status, 'reserved-not-implemented');
});

assert.strictEqual(endpointPlan['POST /v1/anonymous-sessions'].requiresHttps, true);
assert.strictEqual(endpointPlan['POST /v1/anonymous-sessions'].mode, 'anonymous');
assert.strictEqual(endpointPlan['POST /v1/session/login'].requiresHttps, true);
assert.strictEqual(endpointPlan['GET /v1/profile'].requiresAuthenticatedSession, true);
assert.strictEqual(endpointPlan['PUT /v1/profile'].requiresAuthenticatedSession, true);
assert.strictEqual(endpointPlan['DELETE /v1/profile'].requiresAuthenticatedSession, true);

[
  'Do not store plaintext passwords.',
  'Do not store raw session tokens.',
  'Do not expose profile JSON through wildcard CORS without an authenticated session design.',
  'Do not reuse demo_sessions for production accounts.',
  'Do not fake user_accounts rows for anonymous sessions.',
  'Do not allow profile reads or writes without proving caller ownership through a server-validated session token.',
  'Do not overwrite profiles without rowVersion optimistic concurrency checks.',
  'Do not write user profile data to source-backed planning tables.'
].forEach(function(action) {
  assert(contract.forbiddenActions.indexOf(action) !== -1, action + ' should be forbidden');
});

[
  'session.anonymous.created',
  'session.anonymous.rejected',
  'session.anonymous.revoked',
  'profile.read.succeeded',
  'profile.read.rejected',
  'profile.write.succeeded',
  'profile.write.rejected',
  'profile.delete.succeeded',
  'profile.delete.rejected',
  'profile.export.requested',
  'profile.export.succeeded',
  'profile.export.rejected',
  'profile.delete.requested',
  'profile.delete.retention_applied'
].forEach(function(eventName) {
  assert(contract.auditEvents.indexOf(eventName) !== -1, eventName + ' audit event should be reserved');
});

assert.strictEqual(contract.retention.deleteOnUserRequest, true);
assert.strictEqual(contract.retention.exportOnUserRequest, true);
assert.strictEqual(contract.retention.publicSeedsAllowed, false);

[
  'Production authentication is blocked',
  'demo_sessions must remain local/demo-only',
  'Do not store plaintext passwords',
  'POST /v1/anonymous-sessions',
  'POST /v1/session/login',
  'GET /v1/profile',
  '202605241100_reserve_anonymous_session_profile_tables.md',
  'docs/anonymous-session-runtime-sequence.md',
  'response-body `csrfToken`'
].forEach(function(fragment) {
  assert(docs.indexOf(fragment) !== -1, 'docs should mention ' + fragment);
});

[
  'session fixation',
  'route-specific CORS',
  'X-CSRF-Token',
  'response-body `csrfToken`',
  'POST /v1/anonymous-sessions',
  'GET /v1/profile',
  'PUT /v1/profile',
  'DELETE /v1/profile',
  'caller ownership and `row_version`',
  'anonymous_planning_profiles_retention_index',
  'profile.export.rejected',
  'client IP plus normalized Origin',
  'Runtime route work may begin only after'
].forEach(function(fragment) {
  assert(runtimeSequence.indexOf(fragment) !== -1, 'runtime sequence should mention ' + fragment);
});
