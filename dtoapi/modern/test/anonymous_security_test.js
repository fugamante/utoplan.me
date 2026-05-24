'use strict';

const assert = require('assert');
const http = require('http');
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
    req.end();
  });
}

assert.strictEqual(modernApi.ANONYMOUS_SESSION_COOKIE_NAME, 'utoplan_anon_session');
assert.strictEqual(modernApi.ANONYMOUS_CSRF_HEADER, 'x-csrf-token');
assert.strictEqual(modernApi.isAnonymousSessionPath('/v1/anonymous-sessions'), true);
assert.strictEqual(modernApi.isAnonymousProfilePath('/v1/profile'), true);
assert.strictEqual(modernApi.isAnonymousReservedPath('/v1/unis'), false);
assert.strictEqual(modernApi.anonymousAllowedMethods('/v1/anonymous-sessions'), 'POST, OPTIONS');
assert.strictEqual(modernApi.anonymousAllowedMethods('/v1/profile'), 'GET, PUT, DELETE, OPTIONS');

assert.strictEqual(modernApi.anonymousCorsHeaders('/v1/profile', 'https://evil.example', [
  'https://app.example'
]), null);

assert.deepStrictEqual(modernApi.anonymousCorsHeaders('/v1/profile', undefined, [
  'https://app.example'
]), {
  Vary: 'Origin'
});

const allowedProfileCors = modernApi.anonymousCorsHeaders('/v1/profile', 'https://app.example', [
  'https://app.example'
]);
assert.strictEqual(allowedProfileCors['Access-Control-Allow-Origin'], 'https://app.example');
assert.strictEqual(allowedProfileCors['Access-Control-Allow-Credentials'], 'true');
assert.strictEqual(allowedProfileCors['Access-Control-Allow-Methods'], 'GET, PUT, DELETE, OPTIONS');
assert.strictEqual(allowedProfileCors.Vary, 'Origin');

assert.strictEqual(modernApi.hasSameOriginSignal({
  headers: {
    origin: 'https://app.example'
  }
}, ['https://app.example']), true);
assert.strictEqual(modernApi.hasSameOriginSignal({
  headers: {
    referer: 'https://app.example/map'
  }
}, ['https://app.example']), true);
assert.strictEqual(modernApi.hasSameOriginSignal({
  headers: {
    origin: 'https://evil.example'
  }
}, ['https://app.example']), false);
assert.strictEqual(modernApi.hasCsrfHeader({
  headers: {
    'x-csrf-token': 'token'
  }
}), true);
assert.strictEqual(modernApi.hasCsrfHeader({
  headers: {}
}), false);

const server = modernApi.createServer();
const allowedOrigin = 'http://127.0.0.1:18083';

server.listen(0, '127.0.0.1', async function() {
  try {
    const deniedPreflight = await request(server, '/v1/profile', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example'
      }
    });
    assert.strictEqual(deniedPreflight.statusCode, 403);
    assert.strictEqual(deniedPreflight.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(deniedPreflight.headers.vary, 'Origin');

    const allowedPreflight = await request(server, '/v1/profile', {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(allowedPreflight.statusCode, 204);
    assert.strictEqual(allowedPreflight.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(allowedPreflight.headers['access-control-allow-credentials'], 'true');
    assert.strictEqual(allowedPreflight.headers['access-control-allow-methods'], 'GET, PUT, DELETE, OPTIONS');

    const publicPreflight = await request(server, '/v1/unis', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://any.example'
      }
    });
    assert.strictEqual(publicPreflight.statusCode, 204);
    assert.strictEqual(publicPreflight.headers['access-control-allow-origin'], '*');

    const profileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(profileRead.statusCode, 501);
    assert.strictEqual(profileRead.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(JSON.parse(profileRead.body).meta.error, 'Not Implemented');

    const deniedProfileRead = await request(server, '/v1/profile', {
      headers: {
        Origin: 'https://evil.example'
      }
    });
    assert.strictEqual(deniedProfileRead.statusCode, 403);
    assert.strictEqual(deniedProfileRead.headers['access-control-allow-origin'], undefined);

    const missingCsrf = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(missingCsrf.statusCode, 403);
    assert.strictEqual(missingCsrf.headers['access-control-allow-origin'], allowedOrigin);

    const scaffoldedProfileWrite = await request(server, '/v1/profile', {
      method: 'PUT',
      headers: {
        Origin: allowedOrigin,
        'X-CSRF-Token': 'token'
      }
    });
    assert.strictEqual(scaffoldedProfileWrite.statusCode, 501);
    assert.strictEqual(scaffoldedProfileWrite.headers['access-control-allow-origin'], allowedOrigin);

    const missingOriginSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST'
    });
    assert.strictEqual(missingOriginSession.statusCode, 403);
    assert.strictEqual(missingOriginSession.headers['access-control-allow-origin'], undefined);

    const scaffoldedSession = await request(server, '/v1/anonymous-sessions', {
      method: 'POST',
      headers: {
        Origin: allowedOrigin
      }
    });
    assert.strictEqual(scaffoldedSession.statusCode, 501);
    assert.strictEqual(scaffoldedSession.headers['access-control-allow-origin'], allowedOrigin);

    server.close(function(closeError) {
      assert.ifError(closeError);
    });
  } catch (error) {
    server.close(function() {
      throw error;
    });
  }
});
