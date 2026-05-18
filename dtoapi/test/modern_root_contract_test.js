'use strict';

const assert = require('assert');
const http = require('http');
const zlib = require('zlib');

const modernApi = require('../modern/server');
const rootContract = require('../modern/root_contract');

function request(server, path, headers, callback) {
  const address = server.address();
  const req = http.get({
    hostname: '127.0.0.1',
    port: address.port,
    path: path,
    headers: headers || {}
  }, function(response) {
    const chunks = [];

    response.on('data', function(chunk) {
      chunks.push(chunk);
    });

    response.on('end', function() {
      callback(null, {
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks)
      });
    });
  });

  req.on('error', callback);
}

function withServer(callback) {
  const server = modernApi.createServer();

  server.listen(0, '127.0.0.1', function() {
    callback(server, function(error) {
      server.close(function(closeError) {
        if (error || closeError) {
          console.error((error || closeError).stack || (error || closeError).message);
          process.exit(1);
        }
      });
    });
  });
}

withServer(function(server, done) {
  request(server, '/', null, function(error, response) {
    if (error) {
      return done(error);
    }

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8');
    assert.strictEqual(response.headers['access-control-allow-origin'], '*');
    assert(response.headers['access-control-allow-headers'].indexOf('Authorization') !== -1);
    assert(response.headers['access-control-allow-methods'].indexOf('GET') !== -1);
    assert.deepStrictEqual(JSON.parse(response.body.toString()), rootContract.rootPayload());

    request(server, '/', {'accept-encoding': 'gzip'}, function(gzipError, gzipResponse) {
      if (gzipError) {
        return done(gzipError);
      }

      assert.strictEqual(gzipResponse.statusCode, 200);
      assert.strictEqual(gzipResponse.headers['content-encoding'], 'gzip');

      zlib.gunzip(gzipResponse.body, function(gunzipError, result) {
        if (gunzipError) {
          return done(gunzipError);
        }

        assert.deepStrictEqual(JSON.parse(result.toString()), rootContract.rootPayload());
        done();
      });
    });
  });
});
