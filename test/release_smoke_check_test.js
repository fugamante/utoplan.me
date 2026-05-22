'use strict';

var assert = require('assert');
var smoke = require('../scripts/release_smoke_check');

assert.strictEqual(smoke.joinUrl('https://app.example.com', '/healthz'), 'https://app.example.com/healthz');
assert.strictEqual(smoke.joinUrl('https://app.example.com/base/', '/v1/unis'), 'https://app.example.com/base/v1/unis');

smoke.checkAppHealth({
  statusCode: 200,
  body: {
    status: 'ok',
    service: 'utoplan-static-app',
    apiProxy: true,
    demoFixture: false
  }
});

smoke.checkUnis({
  statusCode: 200,
  body: {
    meta: {
      error: null
    },
    data: []
  }
});

smoke.checkApiReady({
  statusCode: 200,
  body: {
    status: 'ok',
    database: 'ok',
    schema: 'ok'
  }
});

function requester(url, callback) {
  var responses = {
    'https://app.example.com/healthz': {
      statusCode: 200,
      body: {
        status: 'ok',
        service: 'utoplan-static-app',
        apiProxy: true,
        demoFixture: false
      }
    },
    'https://app.example.com/v1/unis': {
      statusCode: 200,
      body: {
        meta: {
          error: null
        },
        data: [{id: 1}]
      }
    },
    'https://api.example.internal/readyz': {
      statusCode: 200,
      body: {
        status: 'ok',
        database: 'ok',
        schema: 'ok'
      }
    }
  };

  callback(null, responses[url]);
}

smoke.runChecks({
  UTOPLAN_APP_URL: 'https://app.example.com',
  UTOPLAN_API_URL: 'https://api.example.internal'
}, requester, function(error, labels) {
  assert.ifError(error);
  assert.deepStrictEqual(labels, [
    'app /healthz',
    'app /v1/unis',
    'api /readyz'
  ]);
});

smoke.runChecks({}, requester, function(error) {
  assert(error);
  assert.strictEqual(error.message, 'UTOPLAN_APP_URL is required');
});
