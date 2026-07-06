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

        process.exit(0);
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

    request(server, '/healthz', null, function(healthError, healthResponse) {
      if (healthError) {
        return done(healthError);
      }

      assert.strictEqual(healthResponse.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(healthResponse.body.toString()), {
        status: 'ok',
        service: 'utoplan-modern-api'
      });

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

        request(server, '/v1/planning-context', null, function(planningError, planningResponse) {
          if (planningError) {
            return done(planningError);
          }

          const planningBody = JSON.parse(planningResponse.body.toString());

          assert.strictEqual(planningResponse.statusCode, 200);
          assert(Array.isArray(planningBody.data));
          assert(planningBody.data.length >= 2);
          assert.strictEqual(planningBody.data[0].status, 'candidate-needs-review');
          assert.strictEqual(typeof planningBody.data[0].updatedAt, 'string');
          assert.strictEqual(typeof planningBody.data[0].sourceCount, 'number');
          assert.strictEqual(planningBody.data[0].guardrails.descriptiveOnly, true);
          assert.strictEqual(planningBody.data[0].guardrails.noScores, true);

          request(server, '/v1/planning-context/mun001_construction', null, function(detailError, detailResponse) {
            if (detailError) {
              return done(detailError);
            }

            const detailBody = JSON.parse(detailResponse.body.toString());

            assert.strictEqual(detailResponse.statusCode, 200);
            assert.strictEqual(detailBody.meta.count, 1);
            assert.strictEqual(detailBody.data[0].id, 'mun001_construction');
            assert.strictEqual(detailBody.data[0].status, 'candidate-needs-review');
            assert.strictEqual(detailBody.data[0].updatedAt, '2026-05-29');
            assert.strictEqual(detailBody.data[0].guardrails.noRecommendations, true);

            request(server, '/v1/planning-context', {method: 'POST'}, function(planningMethodError, planningMethodResponse) {
              if (planningMethodError) {
                return done(planningMethodError);
              }

              const planningMethodBody = JSON.parse(planningMethodResponse.body.toString());

              assert.strictEqual(planningMethodResponse.statusCode, 405);
              assert.strictEqual(planningMethodResponse.headers.allow, 'GET, OPTIONS');
              assert.strictEqual(planningMethodBody.meta.error, 'Method Not Allowed');

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
    });
    });
  });
});
