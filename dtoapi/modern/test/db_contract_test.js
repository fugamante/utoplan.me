'use strict';

const assert = require('assert');
const http = require('http');

const db = require('../db');
const modernApi = require('../server');

const contracts = [
  {
    path: '/v1/unis/1',
    expected: {
      id: 1,
      title: 'Contract University',
      address: '100 Contract Ave',
      desc: 'Seeded university row'
    }
  },
  {
    path: '/v1/muns/1',
    expected: {
      id: 1,
      title: 'Contract Municipality',
      county: 1
    }
  },
  {
    path: '/v1/cdepts/1',
    expected: {
      id: 1,
      cnaic: 541
    }
  },
  {
    path: '/v1/cbps/1',
    expected: {
      id: 1,
      cnaic: 541,
      county: 1,
      cnaic_name: 'Professional Services'
    }
  },
  {
    path: '/v1/busines/1',
    expected: {
      id: 1,
      cdepts_id: 1,
      title: 'Contract Business',
      address: '200 Contract St'
    }
  },
  {
    path: '/v1/grace_cs/1',
    statusCode: 200,
    expected: {
      id: 1,
      uni_id: 1,
      cdepts_id: 1,
      rate: '92',
      year: '2016'
    }
  },
  {
    path: '/v1/unis/999',
    statusCode: 404,
    expected: null
  }
];

contracts.forEach(function(contract) {
  contract.statusCode = contract.statusCode || 200;
});

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

function contains(record, expected) {
  Object.keys(expected).forEach(function(key) {
    assert.strictEqual(record[key], expected[key], key + ' should match');
  });
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

function runContract(server, index) {
  if (index >= contracts.length) {
    return finish(server);
  }

  const contract = contracts[index];

  request(server, contract.path, function(error, response) {
    if (error) {
      return finish(server, error);
    }

    try {
      const body = JSON.parse(response.body);

      assert.strictEqual(response.statusCode, contract.statusCode, contract.path + ' should return HTTP ' + contract.statusCode);
      assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8');
      assert.strictEqual(response.headers['access-control-allow-origin'], '*');
      assert.strictEqual(body.meta.error, null);
      assert.strictEqual(body.meta.total, contract.expected ? 1 : 0);
      assert.strictEqual(body.meta.count, contract.expected ? 1 : 0);
      assert.strictEqual(body.meta.offset, 0);

      if (contract.expected) {
        contains(body.data[0], contract.expected);
      } else {
        assert.deepStrictEqual(body.data, []);
      }

      runContract(server, index + 1);
    } catch (assertionError) {
      finish(server, assertionError);
    }
  });
}

const server = modernApi.createServer();

server.listen(0, '127.0.0.1', function() {
  runContract(server, 0);
});
