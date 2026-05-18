'use strict';

const assert = require('assert');
const http = require('http');

const db = require('../db');
const modernApi = require('../server');

function request(server, path, callback) {
  const address = server.address();
  const req = http.get({
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
        headers: response.headers,
        body: Buffer.concat(chunks).toString()
      });
    });
  });

  req.on('error', callback);
}

function finish(server, error) {
  server.close(function(closeError) {
    db.close(function(dbError) {
      const finalError = error || closeError || dbError;

      if (finalError) {
        console.error(finalError.stack || finalError.message);
        process.exit(1);
      }
    });
  });
}

const server = modernApi.createServer();

server.listen(0, '127.0.0.1', function() {
  request(server, '/v1/unis/1', function(error, response) {
    if (error) {
      return finish(server, error);
    }

    try {
      const body = JSON.parse(response.body);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8');
      assert.strictEqual(response.headers['access-control-allow-origin'], '*');
      assert.strictEqual(body.meta.error, null);
      assert.strictEqual(body.meta.total, 1);
      assert.strictEqual(body.meta.count, 1);
      assert.strictEqual(body.meta.offset, 0);
      assert.deepStrictEqual({
        id: body.data[0].id,
        title: body.data[0].title,
        address: body.data[0].address,
        desc: body.data[0].desc
      }, {
        id: 1,
        title: 'Contract University',
        address: '100 Contract Ave',
        desc: 'Seeded university row'
      });

      finish(server);
    } catch (assertionError) {
      finish(server, assertionError);
    }
  });
});
