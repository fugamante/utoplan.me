'use strict';

const assert = require('assert');
const http = require('http');
const zlib = require('zlib');

const modernApi = require('../modern/lib/server');
const rootContract = require('../modern/lib/root_contract');

function request(server, path, options, callback) {
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
      callback(null, {
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks)
      });
    });
  });

  req.on('error', callback);
  req.end();
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

    request(server, '/', {headers: {'accept-encoding': 'gzip'}}, function(gzipError, gzipResponse) {
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

        request(server, '/v1/unis/1', {method: 'POST'}, function(methodError, methodResponse) {
          if (methodError) {
            return done(methodError);
          }

          const body = JSON.parse(methodResponse.body.toString());

          assert.strictEqual(methodResponse.statusCode, 405);
          assert.strictEqual(methodResponse.headers.allow, 'GET, OPTIONS');
          assert.strictEqual(body.meta.error, 'Method Not Allowed');

          request(server, '/v1/unis/not-a-number', null, function(routeError, routeResponse) {
            if (routeError) {
              return done(routeError);
            }

            assert.strictEqual(routeResponse.statusCode, 404);
            assert.strictEqual(JSON.parse(routeResponse.body.toString()).meta.error, 'Not Found');
            done();
          });
        });
      });
    });
  });
});
