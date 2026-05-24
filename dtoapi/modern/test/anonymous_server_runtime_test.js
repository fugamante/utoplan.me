'use strict';

const assert = require('assert');
const http = require('http');
const anonymousSecurity = require('../lib/anonymous_security');
const modernApi = require('../lib/server');

const allowedOrigin = 'http://127.0.0.1:18083';
const tokenHash = anonymousSecurity.hashToken('safeTokenValue');
const csrfHash = anonymousSecurity.hashToken('safeCsrfValue');
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

function request(server, path, options) {
  return new Promise(function(resolve, reject) {
    const address = server.address();
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path: path,
      method: options && options.method ? options.method : 'GET',
      headers: options && options.headers ? options.headers : {}
    }, function(response) {
      const chunks = [];

      response.on('data', function(chunk) {
        chunks.push(chunk);
      });

      response.on('end', function() {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString()
        });
      });
    });

    req.on('error', reject);
    req.end(options && options.body ? options.body : undefined);
  });
}

function parse(response) {
  return response.body ? JSON.parse(response.body) : null;
}

function runtimeDeps(overrides) {
  return Object.assign({
    allowedOrigins: [allowedOrigin],
    trustedProxy: false,
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
        key: 'runtime:' + input.scope,
        limit: 10,
        remaining: 9,
        resetAtMs: Date.now() + 5000
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
      callback(null, Object.assign({}, profileRow, {
        rowVersion: 2,
        profile: input.profile
      }));
    },
    deleteProfileAndRevoke: function(input, callback) {
      assert.strictEqual(input.anonymousSessionId, 11);
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

const originalRuntime = process.env.UTOPLAN_ANONYMOUS_RUNTIME;
const originalRateLimitMode = process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;
const originalEdgeRateLimit = process.env.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT;

function restoreEnv() {
  if (originalRuntime === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RUNTIME;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RUNTIME = originalRuntime;
  }

  if (originalRateLimitMode === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE = originalRateLimitMode;
  }

  if (originalEdgeRateLimit === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT;
  } else {
    process.env.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT = originalEdgeRateLimit;
  }
}

process.env.UTOPLAN_ANONYMOUS_RUNTIME = '1';
process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE = 'edge';
process.env.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT = '1';

const enabledServer = modernApi.createServer({
  anonymousSchemaReady: function(callback) {
    callback(true);
  },
  anonymousDependencies: runtimeDeps()
});

enabledServer.listen(0, '127.0.0.1', async function() {
  try {
    const created = await request(enabledServer, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=safeTokenValue',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: {
          businessIdea: 'Kiosk'
        }
      })
    });
    assert.strictEqual(created.statusCode, 201);
    assert.strictEqual(created.headers['access-control-allow-origin'], allowedOrigin);
    assert(String(created.headers['set-cookie']).indexOf('utoplan_anon_session=safeTokenValue') !== -1);
    assert.strictEqual(parse(created).data[0].csrfToken, 'safeTokenValue');

    const read = await request(enabledServer, '/v1/profile', {
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=safeTokenValue'
      }
    });
    assert.strictEqual(read.statusCode, 200);
    assert.strictEqual(parse(read).data[0].data.businessIdea, 'Kiosk');

    const updated = await request(enabledServer, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=safeTokenValue',
        'X-CSRF-Token': 'safeCsrfValue',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rowVersion: 1,
        profile: {
          businessIdea: 'Updated kiosk'
        }
      })
    });
    assert.strictEqual(updated.statusCode, 200);
    assert.strictEqual(parse(updated).data[0].rowVersion, 2);
    assert.strictEqual(parse(updated).data[0].data.businessIdea, 'Updated kiosk');

    const deleted = await request(enabledServer, '/v1/profile', {
      method: 'DELETE',
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=safeTokenValue',
        'X-CSRF-Token': 'safeCsrfValue'
      }
    });
    assert.strictEqual(deleted.statusCode, 204);
    assert.strictEqual(deleted.body, '');
    assert(String(deleted.headers['set-cookie']).indexOf('Max-Age=0') !== -1);

    enabledServer.close(function(enabledCloseError) {
      assert.ifError(enabledCloseError);

      const gatedServer = modernApi.createServer({
        anonymousSchemaReady: function(callback) {
          callback(false);
        },
        anonymousDependencies: runtimeDeps({
          createSession: function() {
            assert.fail('disabled runtime must not call anonymous handlers');
          }
        })
      });

      gatedServer.listen(0, '127.0.0.1', async function() {
        try {
          const gated = await request(gatedServer, '/v1/anonymous-sessions', {
            method: 'POST',
            headers: {
              Origin: allowedOrigin
            },
            body: '{}'
          });
          assert.strictEqual(gated.statusCode, 501);
          assert.strictEqual(parse(gated).meta.error, 'Not Implemented');

          gatedServer.close(function(gatedCloseError) {
            restoreEnv();
            assert.ifError(gatedCloseError);
          });
        } catch (error) {
          gatedServer.close(function() {
            restoreEnv();
            throw error;
          });
        }
      });
    });
  } catch (error) {
    enabledServer.close(function() {
      restoreEnv();
      throw error;
    });
  }
});
