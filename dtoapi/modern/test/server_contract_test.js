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

function request(server, path, callback) {
  const address = server.address();
  const req = http.request({
    hostname: '127.0.0.1',
    port: address.port,
    path: path
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
});
