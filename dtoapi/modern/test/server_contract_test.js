'use strict';

const assert = require('assert');
const http = require('http');
const db = require('../lib/db');
const modernApi = require('../lib/server');

const uniMatch = modernApi.matchRecord('/v1/unis/123');
assert(uniMatch);
assert.strictEqual(uniMatch[1], 'unis');
assert.strictEqual(uniMatch[2], '123');

const uniCollectionMatch = modernApi.matchCollection('/v1/unis');
assert(uniCollectionMatch);
assert.strictEqual(uniCollectionMatch[1], 'unis');

const businessMatch = modernApi.matchRecord('/v1/businesses/123');
assert(businessMatch);
assert.strictEqual(businessMatch[1], 'businesses');
assert.strictEqual(businessMatch[2], '123');

const legacyBusinessMatch = modernApi.matchRecord('/v1/busines/123');
assert(legacyBusinessMatch);
assert.strictEqual(legacyBusinessMatch[1], 'busines');
assert.strictEqual(legacyBusinessMatch[2], '123');

const gradeMatch = modernApi.matchRecord('/v1/grade_cs/123');
assert(gradeMatch);
assert.strictEqual(gradeMatch[1], 'grade_cs');
assert.strictEqual(gradeMatch[2], '123');

const legacyGradeMatch = modernApi.matchRecord('/v1/grace_cs/123');
assert(legacyGradeMatch);
assert.strictEqual(legacyGradeMatch[1], 'grace_cs');
assert.strictEqual(legacyGradeMatch[2], '123');

assert.strictEqual(modernApi.matchRecord('/v1/unis/not-a-number'), null);
assert.strictEqual(modernApi.matchRecord('/v1/unknown/1'), null);
assert.strictEqual(modernApi.matchCollection('/v1/unis/1'), null);
assert.strictEqual(modernApi.matchCollection('/v1/unknown'), null);

assert.deepStrictEqual(modernApi.SUPPORTED_COLLECTION_QUERY_PARAMS, ['limit', 'offset']);
assert.deepStrictEqual(modernApi.parseCollectionQuery(new URLSearchParams('')), {
  limit: null,
  offset: 0
});
assert.deepStrictEqual(modernApi.parseCollectionQuery(new URLSearchParams('limit=25&offset=10&ignored=true')), {
  limit: 25,
  offset: 10
});
assert.deepStrictEqual(modernApi.parseCollectionQuery(new URLSearchParams('sort=title&filter=business')), {
  limit: null,
  offset: 0
});
assert.strictEqual(modernApi.parseCollectionQuery(new URLSearchParams('limit=0')), null);
assert.strictEqual(modernApi.parseCollectionQuery(new URLSearchParams('limit=1001')), null);
assert.strictEqual(modernApi.parseCollectionQuery(new URLSearchParams('limit=-1')), null);
assert.strictEqual(modernApi.parseCollectionQuery(new URLSearchParams('offset=-1')), null);
assert.strictEqual(modernApi.parseCollectionQuery(new URLSearchParams('offset=1.5')), null);

assert.strictEqual(modernApi.acceptsGzip({
  headers: {
    'accept-encoding': 'br, gzip'
  }
}), true);

assert.strictEqual(modernApi.acceptsGzip({
  headers: {
    'accept-encoding': 'br'
  }
}), false);

assert.strictEqual(typeof modernApi.createServer().listen, 'function');

function request(server, path, callback, options) {
  const address = server.address();
  const req = http.request({
    hostname: '127.0.0.1',
    port: address.port,
    path: path,
    method: options && options.method ? options.method : 'GET'
  }, function(response) {
    const chunks = [];

    response.on('data', function(chunk) {
      chunks.push(chunk);
    });

    response.on('end', function() {
      callback(null, {
        statusCode: response.statusCode,
        body: Buffer.concat(chunks).toString()
      });
    });
  });

  req.on('error', callback);
  req.end();
}

const originalReady = db.ready;
const originalError = console.error;
const server = modernApi.createServer();

db.ready = function(callback) {
  callback(null, {
    version: 'baseline-read-v1',
    ok: true,
    missing: [],
    loadIndexes: {
      ok: false,
      missing: ['unis_title_address_unique'],
      unavailable: false
    }
  });
};

server.listen(0, '127.0.0.1', function() {
  request(server, '/v1/source-metadata', function(metadataError, metadataResponse) {
    assert.ifError(metadataError);
    assert.strictEqual(metadataResponse.statusCode, 200);
    assert.strictEqual(JSON.parse(metadataResponse.body).scope, 'puerto-rico-only');
    assert.strictEqual(JSON.parse(metadataResponse.body).tables.unis.dataClass, 'source-backed-candidate');
    assert.strictEqual(JSON.parse(metadataResponse.body).blockedTables.businesses.dataClass, 'blocked');

    request(server, '/v1/planning/context-demo', function(contextError, contextResponse) {
      assert.ifError(contextError);
      assert.strictEqual(contextResponse.statusCode, 200);
      assert.strictEqual(JSON.parse(contextResponse.body).mode, 'demo-fixture');
      assert.strictEqual(JSON.parse(contextResponse.body).selectedCategory.id, 'professional_services');
      assert.strictEqual(JSON.parse(contextResponse.body).signals.length, 0);

      request(server, '/v1/planning/context?municipality=0&category=professional_services', function(badQueryError, badQueryResponse) {
        assert.ifError(badQueryError);
        assert.strictEqual(badQueryResponse.statusCode, 400);
        assert.strictEqual(JSON.parse(badQueryResponse.body).meta.error, 'Bad Request');

        request(server, '/v1/source-metadata', function(methodError, methodResponse) {
          assert.ifError(methodError);
          assert.strictEqual(methodResponse.statusCode, 405);
          assert.strictEqual(JSON.parse(methodResponse.body).meta.error, 'Method Not Allowed');

          request(server, '/v1/demo/session?session=demo-session-1', function(sessionMethodError, sessionMethodResponse) {
            assert.ifError(sessionMethodError);
            assert.strictEqual(sessionMethodResponse.statusCode, 405);
            assert.strictEqual(JSON.parse(sessionMethodResponse.body).meta.error, 'Method Not Allowed');

            request(server, '/readyz', function(error, response) {
              assert.ifError(error);
              assert.strictEqual(response.statusCode, 200);
              assert.strictEqual(JSON.parse(response.body).database, 'ok');
              assert.strictEqual(JSON.parse(response.body).schema, 'ok');
              assert.strictEqual(JSON.parse(response.body).schemaVersion, 'baseline-read-v1');
              assert.strictEqual(JSON.parse(response.body).loadPolicyIndexes, 'missing');
              assert.deepStrictEqual(JSON.parse(response.body).missingLoadPolicyIndexes, ['unis_title_address_unique']);

              db.ready = function(callback) {
                callback(new Error('database unavailable'));
              };
              console.error = function() {};

              request(server, '/readyz', function(failedError, failedResponse) {
                assert.ifError(failedError);
                assert.strictEqual(failedResponse.statusCode, 503);
                assert.strictEqual(JSON.parse(failedResponse.body).database, 'unavailable');
                assert.strictEqual(JSON.parse(failedResponse.body).schema, 'unknown');

                db.ready = originalReady;
                console.error = originalError;
                server.close(function(closeError) {
                  assert.ifError(closeError);
                });
              });
            });
          }, {
            method: 'POST'
          });
        }, {
          method: 'POST'
        });
      });
    });
  });
});
