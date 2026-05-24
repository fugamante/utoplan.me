'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-session-auth-contract.json'), 'utf8'));
var docs = fs.readFileSync(path.join(root, 'docs', 'session-auth-contract.md'), 'utf8');
var currentModes = {};
var proposedTables = {};
var endpointPlan = {};

assert.strictEqual(contract.schemaVersion, 1);
assert.strictEqual(contract.scope, 'puerto-rico-only');
assert.strictEqual(contract.contractStatus, 'draft-no-production-auth');
assert.strictEqual(contract.implementationStatus, 'blocked-pending-design');

contract.currentAllowedModes.forEach(function(mode) {
  currentModes[mode] = true;
});
assert.strictEqual(currentModes['browser-local-profile'], true);
assert.strictEqual(currentModes['demo-db-session'], true);

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

[
  'password_hash',
  'password_algorithm'
].forEach(function(column) {
  assert(proposedTables.user_accounts.minimumColumns.indexOf(column) !== -1);
});
assert(proposedTables.user_sessions.minimumColumns.indexOf('token_hash') !== -1);
assert(proposedTables.planning_profiles.minimumColumns.indexOf('deleted_at') !== -1);

contract.endpointPlan.forEach(function(endpoint) {
  endpointPlan[endpoint.method + ' ' + endpoint.path] = endpoint;
  assert.strictEqual(endpoint.status, 'reserved-not-implemented');
});

assert.strictEqual(endpointPlan['POST /v1/session/login'].requiresHttps, true);
assert.strictEqual(endpointPlan['GET /v1/profile'].requiresAuthenticatedSession, true);
assert.strictEqual(endpointPlan['PUT /v1/profile'].requiresAuthenticatedSession, true);
assert.strictEqual(endpointPlan['DELETE /v1/profile'].requiresAuthenticatedSession, true);

[
  'Do not store plaintext passwords.',
  'Do not store raw session tokens.',
  'Do not expose profile JSON through wildcard CORS without an authenticated session design.',
  'Do not reuse demo_sessions for production accounts.',
  'Do not write user profile data to source-backed planning tables.'
].forEach(function(action) {
  assert(contract.forbiddenActions.indexOf(action) !== -1, action + ' should be forbidden');
});

[
  'session.login.succeeded',
  'session.login.failed',
  'profile.write.rejected'
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
  'POST /v1/session/login',
  'GET /v1/profile'
].forEach(function(fragment) {
  assert(docs.indexOf(fragment) !== -1, 'docs should mention ' + fragment);
});
