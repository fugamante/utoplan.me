'use strict';

const assert = require('assert');
const handlers = require('../lib/anonymous_endpoint_handlers');
const anonymousProfile = require('../lib/anonymous_profile');
const anonymousSecurity = require('../lib/anonymous_security');

const tokenHash = Buffer.from('token-hash');
const csrfHash = anonymousSecurity.hashToken('safeTokenValue');
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
    allowedOrigins: [
      'http://127.0.0.1:18083',
      'http://localhost:18083'
    ],
    createSecret: function() {
      return {
        raw: 'safeTokenValue',
        hash: tokenHash
      };
    },
    createPublicId: function() {
      return 'anon_public_11';
    },
    checkRateLimit: function(input, callback) {
      callback(null, {
        allowed: true,
        key: 'test:' + input.scope,
        limit: 10,
        remaining: 9,
        resetAtMs: now.getTime() + 5000
      });
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
    },
    findProfileState: function(anonymousSessionId, callback) {
      assert.strictEqual(anonymousSessionId, 11);
      callback(null, profileRow);
    },
    revokeSession: function(input, callback) {
      assert.strictEqual(input.anonymousSessionId, 11);
      assert.strictEqual(input.revokeReason, 'session_rotated');
      callback(null, Object.assign({}, sessionRow, {
        revokedAt: '2026-05-24T12:05:00.000Z',
        revokeReason: 'session_rotated'
      }));
    },
    recordEvent: function(input, callback) {
      assert(input.eventName);
      callback(null);
    },
    updateProfile: function(input, callback) {
      assert.strictEqual(input.anonymousSessionId, 11);
      assert.strictEqual(input.expectedRowVersion, 1);
      callback(null, Object.assign({}, profileRow, {
        rowVersion: 2,
        profile: input.profile
      }));
    },
    deleteProfileAndRevoke: function(input, callback) {
      assert.strictEqual(input.anonymousSessionId, 11);
      assert.strictEqual(input.revokeReason, 'profile_deleted');
      callback(null, {
        profile: Object.assign({}, profileRow, {
          deletedAt: '2026-05-24T12:30:00.000Z',
          deletionRequestedAt: '2026-05-24T12:30:00.000Z'
        }),
        session: Object.assign({}, sessionRow, {
          revokedAt: '2026-05-24T12:30:00.000Z',
          revokeReason: 'profile_deleted'
        })
      });
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

const rotatedCreateEvents = [];

handlers.handleCreateAnonymousSession(request(JSON.stringify({
  profile: {
    businessIdea: 'Kiosk'
  }
})), baseDeps({
  checkRateLimit: function(input, callback) {
    callback(null, {
      allowed: false,
      key: 'limited',
      limit: 1,
      remaining: 0,
      resetAtMs: now.getTime() + 5000
    });
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
}), {
  cookie: ''
}), baseDeps(), function(error, result) {
  assert.ifError(error);
  const parsed = JSON.parse(result.body);

  assert.strictEqual(result.statusCode, 201);
  assert(result.headers['Set-Cookie'].indexOf('utoplan_anon_session=safeTokenValue') !== -1);
  assert.strictEqual(parsed.data[0].session.publicId, 'anon_public_11');
  assert.strictEqual(parsed.data[0].csrfToken, 'safeTokenValue');
  assert.deepStrictEqual(parsed.data[0].profile, anonymousProfile.profileEnvelope(profileRow));
});

handlers.handleCreateAnonymousSession(request(JSON.stringify({
  profile: {
    businessIdea: 'Kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps({
  revokeSession: function(input, callback) {
    assert.strictEqual(input.anonymousSessionId, 11);
    assert.strictEqual(input.revokeReason, 'session_rotated');
    callback(null, Object.assign({}, sessionRow, {
      revokedAt: '2026-05-24T12:05:00.000Z',
      revokeReason: 'session_rotated'
    }));
  },
  recordEvent: function(input, callback) {
    rotatedCreateEvents.push(input);
    callback(null);
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 201);
  assert.deepStrictEqual(rotatedCreateEvents.map(function(event) {
    return event.eventName;
  }), [
    'session.anonymous.revoked',
    'session.anonymous.created'
  ]);
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
  readRateLimitCalls: 0,
  checkRateLimit: function(input, callback) {
    this.readRateLimitCalls += 1;
    if (this.readRateLimitCalls === 1) {
      assert.strictEqual(input.sessionPublicId, null);
    } else {
      assert.strictEqual(input.sessionPublicId, 'anon_public_11');
    }
    callback(null, {
      allowed: true,
      key: 'session-read',
      limit: 10,
      remaining: 9,
      resetAtMs: now.getTime() + 5000
    });
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(result.body).data[0], anonymousProfile.profileEnvelope(profileRow));
});

handlers.handleReadAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps({
  findProfileState: function(anonymousSessionId, callback) {
    callback(null, null);
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 404);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Not Found');
});

handlers.handleReadAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps({
  findProfileState: function(anonymousSessionId, callback) {
    callback(null, Object.assign({}, profileRow, {
      deletedAt: '2026-05-24T12:30:00.000Z'
    }));
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 410);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Gone');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  checkRateLimit: function(input, callback) {
    assert.strictEqual(input.scope, 'profile_write');
    assert.strictEqual(input.sessionPublicId, 'anon_public_11');
    callback(null, {
      allowed: true,
      key: 'session-write',
      limit: 10,
      remaining: 9,
      resetAtMs: now.getTime() + 5000
    });
  }
}), function(error, result) {
  assert.ifError(error);
  const parsed = JSON.parse(result.body);

  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(parsed.data[0].rowVersion, 2);
  assert.strictEqual(parsed.data[0].data.businessIdea, 'Updated kiosk');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  origin: 'https://evil.example',
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  findSessionByTokenHash: function() {
    assert.fail('disallowed origin must stop before session lookup');
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 403);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Forbidden');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps(), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 403);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Forbidden');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'badTokenValue'
}), baseDeps({
  checkRateLimit: function(input, callback) {
    if (input.scope === 'csrf_failure') {
      assert.strictEqual(input.failureType, 'invalid_csrf');
      assert.strictEqual(input.sessionPublicId, 'anon_public_11');
      callback(null, {
        allowed: false,
        key: 'csrf-failure',
        limit: 1,
        remaining: 0,
        resetAtMs: now.getTime() + 5000
      });
      return;
    }

    callback(null, {
      allowed: true,
      key: 'test:' + input.scope,
      limit: 10,
      remaining: 9,
      resetAtMs: now.getTime() + 5000
    });
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 429);
  assert.strictEqual(result.headers['Retry-After'], '5');
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Too Many Requests');
});

handlers.handleUpdateAnonymousProfile(request('{bad}', {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps(), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 400);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'invalid_request');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  updateProfile: function(input, callback) {
    callback(null, null);
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 409);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Conflict');
});

handlers.handleUpdateAnonymousProfile(request(JSON.stringify({
  rowVersion: 1,
  profile: {
    businessIdea: 'Updated kiosk'
  }
}), {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  updateProfile: function(input, callback) {
    callback(null, null);
  },
  findProfile: function(anonymousSessionId, callback) {
    assert.strictEqual(anonymousSessionId, 11);
    callback(null, null);
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 404);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Not Found');
});

handlers.handleDeleteAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  checkRateLimit: function(input, callback) {
    assert.strictEqual(input.scope, 'profile_delete');
    assert.strictEqual(input.sessionPublicId, 'anon_public_11');
    callback(null, {
      allowed: true,
      key: 'session-delete',
      limit: 10,
      remaining: 9,
      resetAtMs: now.getTime() + 5000
    });
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 204);
  assert.strictEqual(result.body, '');
  assert(result.headers['Set-Cookie'].indexOf('utoplan_anon_session=') !== -1);
  assert(result.headers['Set-Cookie'].indexOf('Max-Age=0') !== -1);
});

handlers.handleDeleteAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue'
}), baseDeps(), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 403);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Forbidden');
});

handlers.handleDeleteAnonymousProfile(request('', {
  origin: 'https://evil.example',
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  findSessionByTokenHash: function() {
    assert.fail('disallowed origin must stop before session lookup');
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 403);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Forbidden');
});

handlers.handleDeleteAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  deleteProfileAndRevoke: function(input, callback) {
    callback(null, {
      profile: null,
      session: Object.assign({}, sessionRow, {
        revokedAt: '2026-05-24T12:30:00.000Z',
        revokeReason: 'profile_deleted'
      })
    });
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 410);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Gone');
});

handlers.handleDeleteAnonymousProfile(request('', {
  cookie: 'utoplan_anon_session=safeTokenValue',
  'x-csrf-token': 'safeTokenValue'
}), baseDeps({
  deleteProfileAndRevoke: function(input, callback) {
    callback(null, {
      profile: Object.assign({}, profileRow, {
        deletedAt: '2026-05-24T12:30:00.000Z'
      }),
      session: null
    });
  }
}), function(error, result) {
  assert.ifError(error);
  assert.strictEqual(result.statusCode, 500);
  assert.strictEqual(JSON.parse(result.body).meta.error, 'Internal Server Error');
});
