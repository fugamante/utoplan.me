'use strict';

const assert = require('assert');
const anonymousProfile = require('../lib/anonymous_profile');

assert.strictEqual(anonymousProfile.PROFILE_SCHEMA_VERSION, 1);

assert.strictEqual(anonymousProfile.insertAnonymousSessionQuery(), [
  'INSERT INTO anonymous_sessions (public_id, token_hash, csrf_token_hash, expires_at)',
  'VALUES ($1, $2, $3, $4)',
  'RETURNING id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason'
].join(' '));

assert.strictEqual(anonymousProfile.insertAnonymousProfileQuery(), [
  'INSERT INTO anonymous_planning_profiles (anonymous_session_id, schema_version, row_version, profile)',
  'VALUES ($1, $2, 1, $3)',
  'RETURNING id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at'
].join(' '));

assert.strictEqual(anonymousProfile.selectActiveSessionByTokenHashQuery(), [
  'SELECT id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason',
  'FROM anonymous_sessions',
  'WHERE token_hash = $1',
  'AND revoked_at IS NULL',
  'AND expires_at > NOW()',
  'LIMIT 1'
].join(' '));

assert(anonymousProfile.touchAnonymousSessionQuery().indexOf('last_seen_at = NOW()') !== -1);
assert(anonymousProfile.touchAnonymousSessionQuery().indexOf('expires_at > NOW()') !== -1);

assert.strictEqual(anonymousProfile.selectActiveProfileBySessionIdQuery(), [
  'SELECT id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at',
  'FROM anonymous_planning_profiles',
  'WHERE anonymous_session_id = $1',
  'AND deleted_at IS NULL',
  'LIMIT 1'
].join(' '));

assert(anonymousProfile.selectProfileStateBySessionIdQuery().indexOf('WHERE anonymous_session_id = $1') !== -1);
assert.strictEqual(anonymousProfile.selectProfileStateBySessionIdQuery().indexOf('AND deleted_at IS NULL'), -1);

assert(anonymousProfile.updateOwnedProfileQuery().indexOf('anonymous_session_id = $1') !== -1);
assert(anonymousProfile.updateOwnedProfileQuery().indexOf('row_version = $3') !== -1);
assert(anonymousProfile.updateOwnedProfileQuery().indexOf('deleted_at IS NULL') !== -1);
assert(anonymousProfile.updateOwnedProfileQuery().indexOf('row_version = row_version + 1') !== -1);

assert(anonymousProfile.softDeleteOwnedProfileQuery().indexOf('anonymous_session_id = $1') !== -1);
assert(anonymousProfile.softDeleteOwnedProfileQuery().indexOf('deleted_at IS NULL') !== -1);
assert(anonymousProfile.softDeleteOwnedProfileQuery().indexOf('deletion_requested_at = NOW()') !== -1);

assert(anonymousProfile.revokeAnonymousSessionQuery().indexOf('revoked_at = NOW()') !== -1);
assert(anonymousProfile.revokeAnonymousSessionQuery().indexOf('rotated_at = NOW()') !== -1);
assert(anonymousProfile.revokeAnonymousSessionQuery().indexOf('revoke_reason = $2') !== -1);
assert(anonymousProfile.revokeAnonymousSessionQuery().indexOf('AND revoked_at IS NULL') !== -1);

assert.strictEqual(anonymousProfile.insertAnonymousProfileEventQuery(), [
  'INSERT INTO anonymous_profile_events (anonymous_session_id, anonymous_profile_id, event_name, metadata)',
  'VALUES ($1, $2, $3, $4)',
  'RETURNING id'
].join(' '));

const tokenHash = Buffer.from('token-hash');
const csrfTokenHash = Buffer.from('csrf-hash');
assert.deepStrictEqual(anonymousProfile.sessionRow({
  id: '7',
  public_id: 'anonymous-session-public-id',
  token_hash: tokenHash,
  csrf_token_hash: csrfTokenHash,
  created_at: '2026-05-24T00:00:00.000Z',
  last_seen_at: null,
  expires_at: '2026-05-25T00:00:00.000Z',
  revoked_at: null,
  revoke_reason: null
}), {
  id: 7,
  publicId: 'anonymous-session-public-id',
  tokenHash: tokenHash,
  csrfTokenHash: csrfTokenHash,
  createdAt: '2026-05-24T00:00:00.000Z',
  lastSeenAt: null,
  expiresAt: '2026-05-25T00:00:00.000Z',
  revokedAt: null,
  revokeReason: null
});

const profileRow = anonymousProfile.profileRow({
  id: '9',
  anonymous_session_id: '7',
  schema_version: '1',
  row_version: '3',
  profile: '{"businessIdea":"Bakery","selectedMunicipalityId":1,"selectedCategoryId":"food_services"}',
  created_at: '2026-05-23T00:00:00.000Z',
  updated_at: '2026-05-24T00:00:00.000Z',
  deleted_at: null,
  deletion_requested_at: null,
  export_requested_at: null
});

assert.deepStrictEqual(profileRow, {
  id: 9,
  anonymousSessionId: 7,
  schemaVersion: 1,
  rowVersion: 3,
  profile: {
    businessIdea: 'Bakery',
    selectedMunicipalityId: 1,
    selectedCategoryId: 'food_services'
  },
  createdAt: '2026-05-23T00:00:00.000Z',
  updatedAt: '2026-05-24T00:00:00.000Z',
  deletedAt: null,
  deletionRequestedAt: null,
  exportRequestedAt: null
});

assert.deepStrictEqual(anonymousProfile.profileEnvelope(profileRow), {
  schemaVersion: 1,
  rowVersion: 3,
  updatedAt: '2026-05-24T00:00:00.000Z',
  data: {
    businessIdea: 'Bakery',
    selectedMunicipalityId: 1,
    selectedCategoryId: 'food_services'
  }
});

function executorFor(results) {
  const calls = [];

  return {
    calls: calls,
    query: function(text, params, callback) {
      const next = results.shift();
      calls.push({
        text: text,
        params: params
      });

      if (next.error) {
        callback(next.error, {
          rows: []
        });
        return;
      }

      callback(null, {
        rows: next.rows
      });
    }
  };
}

const sessionInsertRow = {
  id: '11',
  public_id: 'anon_public_11',
  token_hash: tokenHash,
  csrf_token_hash: csrfTokenHash,
  created_at: '2026-05-24T00:00:00.000Z',
  last_seen_at: null,
  expires_at: '2026-05-25T00:00:00.000Z',
  revoked_at: null,
  revoke_reason: null
};
const profileInsertRow = {
  id: '12',
  anonymous_session_id: '11',
  schema_version: '1',
  row_version: '1',
  profile: {
    businessIdea: 'Cafe'
  },
  created_at: '2026-05-24T00:00:00.000Z',
  updated_at: '2026-05-24T00:00:00.000Z',
  deleted_at: null,
  deletion_requested_at: null,
  export_requested_at: null
};
const createExecutor = executorFor([
  {
    rows: [sessionInsertRow]
  },
  {
    rows: [profileInsertRow]
  }
]);

anonymousProfile.createAnonymousSessionWithExecutor(createExecutor, {
  publicId: 'anon_public_11',
  tokenHash: tokenHash,
  csrfTokenHash: csrfTokenHash,
  expiresAt: new Date('2026-05-25T00:00:00.000Z'),
  profile: {
    businessIdea: 'Cafe'
  }
}, function(error, result) {
  assert.ifError(error);
  assert.strictEqual(createExecutor.calls.length, 2);
  assert.strictEqual(createExecutor.calls[0].text, anonymousProfile.insertAnonymousSessionQuery());
  assert.strictEqual(createExecutor.calls[1].text, anonymousProfile.insertAnonymousProfileQuery());
  assert.strictEqual(createExecutor.calls[1].params[0], 11);
  assert.strictEqual(result.session.publicId, 'anon_public_11');
  assert.strictEqual(result.profile.anonymousSessionId, 11);
});

const deleteExecutor = executorFor([
  {
    rows: [{
      id: '12',
      anonymous_session_id: '11',
      schema_version: '1',
      row_version: '2',
      profile: '{}',
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: '2026-05-24T01:00:00.000Z',
      deleted_at: '2026-05-24T01:00:00.000Z',
      deletion_requested_at: '2026-05-24T01:00:00.000Z',
      export_requested_at: null
    }]
  },
  {
    rows: [{
      id: '11',
      public_id: 'anon_public_11',
      token_hash: tokenHash,
      csrf_token_hash: csrfTokenHash,
      created_at: '2026-05-24T00:00:00.000Z',
      last_seen_at: null,
      expires_at: '2026-05-25T00:00:00.000Z',
      revoked_at: '2026-05-24T01:00:00.000Z',
      revoke_reason: 'profile_deleted'
    }]
  }
]);

anonymousProfile.deleteOwnedProfileAndRevokeWithExecutor(deleteExecutor, {
  anonymousSessionId: 11,
  revokeReason: 'profile_deleted'
}, function(error, result) {
  assert.ifError(error);
  assert.strictEqual(deleteExecutor.calls.length, 2);
  assert.strictEqual(deleteExecutor.calls[0].text, anonymousProfile.softDeleteOwnedProfileQuery());
  assert.strictEqual(deleteExecutor.calls[1].text, anonymousProfile.revokeAnonymousSessionQuery());
  assert.deepStrictEqual(deleteExecutor.calls[1].params, [11, 'profile_deleted']);
  assert.strictEqual(result.profile.deletedAt, '2026-05-24T01:00:00.000Z');
  assert.strictEqual(result.session.revokeReason, 'profile_deleted');
});

const alreadyDeletedExecutor = executorFor([
  {
    rows: []
  }
]);

anonymousProfile.deleteOwnedProfileAndRevokeWithExecutor(alreadyDeletedExecutor, {
  anonymousSessionId: 11
}, function(error, result) {
  assert.ifError(error);
  assert.strictEqual(alreadyDeletedExecutor.calls.length, 1);
  assert.strictEqual(result, null);
});
