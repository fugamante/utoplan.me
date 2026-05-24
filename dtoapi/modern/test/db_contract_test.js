'use strict';

const assert = require('assert');
const http = require('http');

const db = require('../lib/db');
const modernApi = require('../lib/server');

const contracts = [
  {
    path: '/readyz',
    rawExpected: {
      status: 'ok',
      service: 'utoplan-modern-api',
      database: 'ok',
      schema: 'ok',
      schemaVersion: 'baseline-read-v1',
      loadPolicyIndexes: 'ok',
      missingLoadPolicyIndexes: []
    }
  },
  {
    path: '/v1/source-metadata',
    metadataExpected: true
  },
  {
    path: '/v1/planning/context-demo',
    planningContextExpected: true
  },
  {
    path: '/v1/planning/context?municipality=1&category=professional_services',
    liveContextExpected: true
  },
  {
    path: '/v1/planning/context?municipality=999&category=professional_services',
    statusCode: 404,
    error: 'Not Found'
  },
  {
    path: '/v1/planning/context?municipality=1&category=missing',
    statusCode: 400,
    error: 'Bad Request'
  },
  {
    path: '/v1/unis',
    expected: {
      id: 1,
      title: 'Contract University',
      address: '100 Contract Ave',
      desc: 'Seeded university row'
    }
  },
  {
    path: '/v1/unis?limit=1&offset=0',
    expected: {
      id: 1,
      title: 'Contract University',
      address: '100 Contract Ave',
      desc: 'Seeded university row'
    },
    expectedMeta: {
      total: 1,
      count: 1,
      offset: 0
    }
  },
  {
    path: '/v1/unis?limit=1&offset=1',
    expected: null,
    expectedMeta: {
      total: 1,
      count: 0,
      offset: 1
    }
  },
  {
    path: '/v1/unis?offset=1',
    expected: null,
    expectedMeta: {
      total: 1,
      count: 0,
      offset: 1
    }
  },
  {
    path: '/v1/unis?sort=title&filter=business',
    expected: {
      id: 1,
      title: 'Contract University',
      address: '100 Contract Ave',
      desc: 'Seeded university row'
    },
    expectedMeta: {
      total: 1,
      count: 1,
      offset: 0
    }
  },
  {
    path: '/v1/unis?limit=0',
    statusCode: 400,
    error: 'Bad Request'
  },
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
    path: '/v1/businesses/1',
    expected: {
      id: 1,
      cdepts_id: 1,
      title: 'Contract Business',
      address: '200 Contract St'
    }
  },
  {
    path: '/v1/grade_cs/1',
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

      if (contract.rawExpected) {
        assert.deepStrictEqual(body, contract.rawExpected);
        runContract(server, index + 1);
        return;
      }

      if (contract.metadataExpected) {
        assert.strictEqual(body.scope, 'puerto-rico-only');
        assert.strictEqual(body.tables.cbps.dataClass, 'source-backed-candidate');
        assert.strictEqual(body.tables.muns.productionReadiness, 'candidate-needs-review');
        assert.strictEqual(body.tables.unis.sourceBacked, true);
        assert.strictEqual(body.blockedTables.businesses.dataClass, 'blocked');
        runContract(server, index + 1);
        return;
      }

      if (contract.planningContextExpected) {
        assert.strictEqual(body.scope, 'puerto-rico-only');
        assert.strictEqual(body.mode, 'demo-fixture');
        assert.strictEqual(body.selectedMunicipality.title, 'Adjuntas');
        assert.strictEqual(body.selectedCategory.id, 'professional_services');
        assert.strictEqual(body.facts.length, 3);
        assert.strictEqual(body.signals.length, 0);
        assert.strictEqual(body.confidence.label, 'low');
        runContract(server, index + 1);
        return;
      }

      if (contract.liveContextExpected) {
        assert.strictEqual(body.scope, 'puerto-rico-only');
        assert.strictEqual(body.mode, 'live-db');
        assert.strictEqual(body.selectedMunicipality.id, '1');
        assert.strictEqual(body.selectedMunicipality.title, 'Contract Municipality');
        assert.strictEqual(body.selectedMunicipality.county, 1);
        assert.strictEqual(body.selectedCategory.id, 'professional_services');
        assert.deepStrictEqual(body.facts, []);
        assert.strictEqual(body.signals.length, 0);
        assert.strictEqual(body.confidence.label, 'unknown');
        runContract(server, index + 1);
        return;
      }

      if (contract.error) {
        assert.strictEqual(body.meta.error, contract.error);
        assert.deepStrictEqual(body.data, []);
        runContract(server, index + 1);
        return;
      }

      const expectedMeta = contract.expectedMeta || {
        total: contract.expected ? 1 : 0,
        count: contract.expected ? 1 : 0,
        offset: 0
      };

      assert.strictEqual(body.meta.error, null);
      assert.strictEqual(body.meta.total, expectedMeta.total);
      assert.strictEqual(body.meta.count, expectedMeta.count);
      assert.strictEqual(body.meta.offset, expectedMeta.offset);

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
