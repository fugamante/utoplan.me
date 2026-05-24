'use strict';

const assert = require('assert');
const http = require('http');
const anonymousRateLimit = require('../lib/anonymous_rate_limit');
const anonymousRuntime = require('../lib/anonymous_runtime');
const modernApi = require('../lib/server');

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

function parsed(response) {
  return JSON.parse(response.body);
}

function assertReservedJson(response, expectedError) {
  assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.strictEqual(response.headers['x-powered-by'], 'utoplan-modern-api');
  assert.deepStrictEqual(parsed(response), {
    meta: {
      total: 0,
      count: 0,
      offset: 0,
      error: expectedError
    },
    data: []
  });
}

const allowedOrigin = 'http://127.0.0.1:18083';
const acceptedGateEnv = {
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'edge'
};
const originalAnonymousRuntime = process.env.UTOPLAN_ANONYMOUS_RUNTIME;
const originalAnonymousRateLimitMode = process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;
const originalReservedRateLimit = process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT;
const originalReservedRateLimitWindow = process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS;

process.env.UTOPLAN_ANONYMOUS_RUNTIME = acceptedGateEnv.UTOPLAN_ANONYMOUS_RUNTIME;
process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE = acceptedGateEnv.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;

const server = modernApi.createServer();

assert.strictEqual(anonymousRuntime.anonymousRuntimeGate(acceptedGateEnv, true).enabled, true);

function restoreRuntimeEnv() {
  if (originalAnonymousRuntime === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RUNTIME;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RUNTIME = originalAnonymousRuntime;
  }

  if (originalAnonymousRateLimitMode === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE = originalAnonymousRateLimitMode;
  }

  if (originalReservedRateLimit === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT = originalReservedRateLimit;
  }

  if (originalReservedRateLimitWindow === undefined) {
    delete process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS;
  } else {
    process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS = originalReservedRateLimitWindow;
  }
}

server.listen(0, '127.0.0.1', async function() {
  try {
    const sessionPreflight = await request(server, '/v1/anonymous-sessions', {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(sessionPreflight.statusCode, 204);
    assert.strictEqual(sessionPreflight.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(sessionPreflight.headers['access-control-allow-credentials'], 'true');
    assert.strictEqual(sessionPreflight.headers['access-control-allow-methods'], 'POST, OPTIONS');
    assert.strictEqual(sessionPreflight.headers['access-control-allow-headers'], 'Origin, Content-Type, Accept, X-CSRF-Token');
    assert.strictEqual(sessionPreflight.headers.vary, 'Origin');

    const reservedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=attacker_supplied',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: {
          businessIdea: 'mobile coffee cart'
        }
      })
    });
    assert.strictEqual(reservedSession.statusCode, 501);
    assert.strictEqual(reservedSession.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(reservedSession.headers['access-control-allow-credentials'], 'true');
    assert.strictEqual(reservedSession.headers['access-control-allow-methods'], 'POST, OPTIONS');
    assert.strictEqual(reservedSession.headers.vary, 'Origin');
    assert.strictEqual(reservedSession.headers['set-cookie'], undefined);
    assertReservedJson(reservedSession, 'Not Implemented');

    const gatedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(gatedSession.statusCode, 501);
    assertReservedJson(gatedSession, 'Not Implemented');

    const refererSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Referer: allowedOrigin + '/planner'
      }
    });
    assert.strictEqual(refererSession.statusCode, 501);
    assert.strictEqual(refererSession.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(refererSession.headers.vary, 'Origin');
    assertReservedJson(refererSession, 'Not Implemented');

    const deniedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example'
      }
    });
    assert.strictEqual(deniedSession.statusCode, 403);
    assert.strictEqual(deniedSession.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(deniedSession.headers.vary, 'Origin');
    assertReservedJson(deniedSession, 'Forbidden');

    const deniedSessionMethod = await request(server, '/v1/anonymous-sessions', {
      method: 'GET',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(deniedSessionMethod.statusCode, 405);
    assert.strictEqual(deniedSessionMethod.headers.allow, 'POST');
    assert.strictEqual(deniedSessionMethod.headers['access-control-allow-origin'], allowedOrigin);
    assertReservedJson(deniedSessionMethod, 'Method Not Allowed');

    const reservedProfileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: allowedOrigin,
        Cookie: 'utoplan_anon_session=presented_token'
      }
    });
    assert.strictEqual(reservedProfileRead.statusCode, 501);
    assert.strictEqual(reservedProfileRead.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(reservedProfileRead.headers['access-control-allow-credentials'], 'true');
    assert.strictEqual(reservedProfileRead.headers['access-control-allow-methods'], 'GET, PUT, DELETE, OPTIONS');
    assert.strictEqual(reservedProfileRead.headers.vary, 'Origin');
    assert.strictEqual(reservedProfileRead.headers['set-cookie'], undefined);
    assertReservedJson(reservedProfileRead, 'Not Implemented');

    const gatedProfileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(gatedProfileRead.statusCode, 501);
    assertReservedJson(gatedProfileRead, 'Not Implemented');

    const noOriginProfileRead = await request(server, '/v1/profile');
    assert.strictEqual(noOriginProfileRead.statusCode, 501);
    assert.strictEqual(noOriginProfileRead.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(noOriginProfileRead.headers.vary, 'Origin');
    assertReservedJson(noOriginProfileRead, 'Not Implemented');

    const reservedProfileWriteByReferer = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Referer: allowedOrigin + '/planner',
        'X-CSRF-Token': 'csrf-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rowVersion: 1,
        profile: {
          selectedMunicipalityId: 1
        }
      })
    });
    assert.strictEqual(reservedProfileWriteByReferer.statusCode, 501);
    assert.strictEqual(reservedProfileWriteByReferer.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(reservedProfileWriteByReferer.headers.vary, 'Origin');
    assertReservedJson(reservedProfileWriteByReferer, 'Not Implemented');

    const reservedProfileDelete = await request(server, '/v1/profile', {
      method: 'DELETE',
      headers: {
        Origin: allowedOrigin,
        'X-CSRF-Token': 'csrf-token'
      }
    });
    assert.strictEqual(reservedProfileDelete.statusCode, 501);
    assert.strictEqual(reservedProfileDelete.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(reservedProfileDelete.headers['set-cookie'], undefined);
    assertReservedJson(reservedProfileDelete, 'Not Implemented');

    const missingDeleteCsrf = await request(server, '/v1/profile', {
      method: 'DELETE',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(missingDeleteCsrf.statusCode, 403);
    assert.strictEqual(missingDeleteCsrf.headers['access-control-allow-origin'], allowedOrigin);
    assertReservedJson(missingDeleteCsrf, 'Forbidden');

    const deniedProfileDelete = await request(server, '/v1/profile', {
      method: 'DELETE',
      headers: {
        Origin: 'https://evil.example',
        'X-CSRF-Token': 'csrf-token'
      }
    });
    assert.strictEqual(deniedProfileDelete.statusCode, 403);
    assert.strictEqual(deniedProfileDelete.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(deniedProfileDelete.headers.vary, 'Origin');
    assertReservedJson(deniedProfileDelete, 'Forbidden');

    const deniedProfileMethod = await request(server, '/v1/profile', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(deniedProfileMethod.statusCode, 405);
    assert.strictEqual(deniedProfileMethod.headers.allow, 'GET, PUT, DELETE');
    assert.strictEqual(deniedProfileMethod.headers['access-control-allow-origin'], allowedOrigin);
    assertReservedJson(deniedProfileMethod, 'Method Not Allowed');

    anonymousRateLimit.resetAnonymousRateLimits();
    process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT = '1';
    process.env.UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS = '5000';

    const firstLimitedProfileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(firstLimitedProfileRead.statusCode, 501);
    assertReservedJson(firstLimitedProfileRead, 'Not Implemented');

    const limitedProfileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(limitedProfileRead.statusCode, 429);
    assert.strictEqual(limitedProfileRead.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(limitedProfileRead.headers['retry-after'], '5');
    assert.strictEqual(limitedProfileRead.headers['ratelimit-limit'], undefined);
    assert.strictEqual(limitedProfileRead.headers['ratelimit-remaining'], undefined);
    assert.strictEqual(limitedProfileRead.headers['ratelimit-reset'], undefined);
    assert.strictEqual(limitedProfileRead.headers['set-cookie'], undefined);
    assertReservedJson(limitedProfileRead, 'Too Many Requests');

    anonymousRateLimit.resetAnonymousRateLimits();

    const firstLimitedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(firstLimitedSession.statusCode, 501);

    const limitedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(limitedSession.statusCode, 429);
    assert.strictEqual(limitedSession.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(limitedSession.headers['retry-after'], '5');
    assert.strictEqual(limitedSession.headers['set-cookie'], undefined);
    assertReservedJson(limitedSession, 'Too Many Requests');

    const forbiddenSessionBeforeRateLimit = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example'
      }
    });
    assert.strictEqual(forbiddenSessionBeforeRateLimit.statusCode, 403);
    assertReservedJson(forbiddenSessionBeforeRateLimit, 'Forbidden');

    anonymousRateLimit.resetAnonymousRateLimits();

    const firstLimitedProfileWrite = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin,
        'X-CSRF-Token': 'csrf-token'
      }
    });
    assert.strictEqual(firstLimitedProfileWrite.statusCode, 501);

    const limitedProfileWrite = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin,
        'X-CSRF-Token': 'csrf-token'
      }
    });
    assert.strictEqual(limitedProfileWrite.statusCode, 429);
    assert.strictEqual(limitedProfileWrite.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(limitedProfileWrite.headers['retry-after'], '5');
    assert.strictEqual(limitedProfileWrite.headers['set-cookie'], undefined);
    assertReservedJson(limitedProfileWrite, 'Too Many Requests');

    const forbiddenProfileWriteBeforeRateLimit = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(forbiddenProfileWriteBeforeRateLimit.statusCode, 403);
    assertReservedJson(forbiddenProfileWriteBeforeRateLimit, 'Forbidden');

    server.close(function(closeError) {
      restoreRuntimeEnv();
      assert.ifError(closeError);
    });
  } catch (error) {
    server.close(function() {
      restoreRuntimeEnv();
      throw error;
    });
  }
});
