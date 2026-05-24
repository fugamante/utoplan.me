'use strict';

const assert = require('assert');
const handlers = require('../lib/anonymous_endpoint_handlers');
const anonymousProfile = require('../lib/anonymous_profile');

const tokenHash = Buffer.from('token-hash');
const csrfHash = Buffer.from('csrf-hash');
const now = new Date('2026-05-24T12:00:00.000Z');
const profileRow = {
  id: 21,
  anonymousSessionId: 11,
  schemaVersion: 1,
  rowVersion: 1,
  profile: {
    businessIdea: 'Kiosk'
  },
  createdAt: '2026-05-24T12:00:00.000Z',
  updatedAt: '2026-05-24T12:00:00.000Z',
  deletedAt: null,
  deletionRequestedAt: null,
  exportRequestedAt: null
};
const sessionRow = {
  id: 11,
  publicId: 'anon_public_11',
  tokenHash: tokenHash,
  csrfTokenHash: csrfHash,
  createdAt: '2026-05-24T12:00:00.000Z',
  lastSeenAt: null,
  expiresAt: '2026-05-25T12:00:00.000Z',
  revokedAt: null,
  revokeReason: null
};

function baseDeps(overrides) {
  return Object.assign({
    createSecret: function() {
      return {
        raw: 'safeTokenValue',
        hash: tokenHash
      };
    },
    createPublicId: function() {
      return 'anon_public_11';
    },
    checkRateLimit: function(input) {
      return {
        allowed: true,
        key: 'test:' + input.scope,
        limit: 10,
        remaining: 9,
        resetAtMs: now.getTime() + 5000
      };
    },
    createSession: function(input, callback) {
      assert.strictEqual(input.publicId, 'anon_public_11');
      assert.strictEqual(input.profile.businessIdea, 'Kiosk');
      callback(null, profileRow);
    },
    findSessionByTokenHash: function(hash, callback) {
      assert(Buffer.isBuffer(hash));
      callback(null, sessionRow);
    },
    findProfile: function(anonymousSessionId, callback) {
      assert.strictEqual(anonymousSessionId, 11);
      callback(null, profileRow);
    }
  }, overrides || {});
}

function request(body, headers) {
  return {
    headers: Object.assign({
      origin: 'http://127.0.0.1:18083'
    }, headers || {}),
    remoteAddress: '203.0.113.10',
    body: body || '',
    now: now
  };
}

handlers.handleCreateAnonymousSession(request('{bad'), baseDeps(), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 400);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'invalid_request');
});

handlers.handleCreateAnonymousSession(request(JSON.stringify({
  profile: {
    unknown: true
  }
})), baseDeps(), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 422);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'invalid_profile');
});

handlers.handleCreateAnonymousSession(request(JSON.stringify({
  profile: {
    businessIdea: 'Kiosk'
  }
})), baseDeps({
  checkRateLimit: function() {
    return {
      allowed: false,
      key: 'limited',
      limit: 1,
      remaining: 0,
      resetAtMs: now.getTime() + 5000
    };
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 429);
  assert.strictEqual(result.headers['Retry-After'], '5');
  assert.strictEqual(result.headers['RateLimit-Limit'], undefined);
  assert.strictEqual(result.headers['Set-Cookie'], undefined);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Too Many Requests');
});

handlers.handleCreateAnonymousSession(request(JSON.stringify({
  profile: {
    businessIdea: 'Kiosk'
  }
})), baseDeps(), function(error, result) {
  assert.ifError(error);
  const parsed = JSON.parse(result.body);

  assert.strictEqual(result.statusCode, 201);
  assert(result.headers['Set-Cookie'].indexOf('utoplan_anon_session=safeTokenValue') !== -1);
  assert.strictEqual(parsed.data[0].session.publicId, 'anon_public_11');
  assert.strictEqual(parsed.data[0].csrfToken, 'safeTokenValue');
  assert.deepStrictEqual(parsed.data[0].profile, anonymousProfile.profileEnvelope(profileRow));
});

handlers.authenticateAnonymousSession(request('', {}), baseDeps(), function(error, authResult) {
  assert.ifError(error);
  assert.strictEqual(authResult.ok, false);
  assert.strictEqual(authResult.auth, null);
  assert.strictEqual(authResult.result.statusCode, 401);
  assert.strictEqual(JSON.parse(authResult.result.body).meta.error, 'Unauthorized');
});

handlers.authenticateAnonymousSession(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps(), function(error, authResult) {
  assert.ifError(error);
  assert.strictEqual(authResult.ok, true);
  assert.strictEqual(authResult.result, null);
  assert.strictEqual(authResult.auth.session.id, 11);
});

handlers.handleReadAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps({
  checkRateLimit: function(input) {
    assert.strictEqual(input.sessionPublicId, 'anon_public_11');
    return {
      allowed: true,
      key: 'session-read',
      limit: 10,
      remaining: 9,
      resetAtMs: now.getTime() + 5000
    };
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(result.body).data[0], anonymousProfile.profileEnvelope(profileRow));
});

handlers.handleReadAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps({
  findProfile: function(anonymousSessionId, callback) {
    callback(null, null);
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 404);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Not Found');
});
