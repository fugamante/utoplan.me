'use strict';

var assert = require('assert');
var smoke = require('../scripts/release_smoke_check');

assert.strictEqual(smoke.joinUrl('https://app.example.com', '/healthz'), 'https://app.example.com/healthz');
assert.strictEqual(smoke.joinUrl('https://app.example.com/base/', '/v1/unis'), 'https://app.example.com/base/v1/unis');
assert.strictEqual(
  smoke.joinUrl('https://app.example.com/base/', '/v1/planning-context'),
  'https://app.example.com/base/v1/planning-context'
);
assert.strictEqual(
  smoke.sanitizeUrl('https://user:secret@app.example.com/base/v1/unis?token=secret#frag'),
  'https://app.example.com/base/v1/unis'
);
assert.strictEqual(
  smoke.sanitizeRequestError(
    new Error('https://user:secret@app.example.com/v1/unis?token=secret timed out'),
    'https://user:secret@app.example.com/v1/unis?token=secret'
  ),
  'https://app.example.com/v1/unis timed out'
);

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

smoke.checkPlanningContext({
  statusCode: 200,
  body: {
    meta: {
      error: null
    },
    data: [{
      id: 'mun001_construction',
      guardrails: {
        descriptiveOnly: true,
        noScores: true,
        noRankings: true,
        noRecommendations: true
      }
    }]
  }
});

assert.throws(function() {
  smoke.checkPlanningContext({
    statusCode: 200,
    body: {
      meta: {
        error: null
      },
      data: []
    }
  });
}, /returned no summaries/);

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
    'https://app.example.com/v1/planning-context': {
      statusCode: 200,
      body: {
        meta: {
          error: null
        },
        data: [{
          id: 'mun001_construction',
          guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
          }
        }]
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
}, requester, function(error, labels, evidence) {
  assert.ifError(error);
  assert.deepStrictEqual(labels, [
    'app /healthz',
    'app /v1/unis',
    'app /v1/planning-context',
    'api /readyz'
  ]);
  assert.strictEqual(evidence.schemaVersion, 1);
  assert.strictEqual(evidence.status, 'passed');
  assert.deepStrictEqual(evidence.checks.map(function(check) {
    return check.label;
  }), labels);
  assert.deepStrictEqual(evidence.checks.map(function(check) {
    return check.outcome;
  }), ['passed', 'passed', 'passed', 'passed']);
  assert.deepStrictEqual(evidence.checks.map(function(check) {
    return check.statusCode;
  }), [200, 200, 200, 200]);
});

smoke.runChecks({}, requester, function(error, labels, evidence) {
  assert(error);
  assert.strictEqual(error.message, 'UTOPLAN_APP_URL is required');
  assert.deepStrictEqual(labels, []);
  assert.deepStrictEqual(evidence, {
    schemaVersion: 1,
    status: 'failed',
    checks: [],
    error: 'UTOPLAN_APP_URL is required'
  });
});

function failingRequester(url, callback) {
  if (url === 'https://user:secret@app.example.com/v1/unis') {
    callback(null, {
      statusCode: 500,
      body: {
        meta: {
          error: 'failed'
        },
        data: []
      }
    });
    return;
  }

  requester(url.replace('https://user:secret@', 'https://'), callback);
}

smoke.runChecks({
  UTOPLAN_APP_URL: 'https://user:secret@app.example.com'
}, failingRequester, function(error, labels, evidence) {
  assert(error);
  assert.strictEqual(error.message, 'app /v1/unis returned HTTP 500');
  assert.deepStrictEqual(labels, ['app /healthz']);
  assert.strictEqual(evidence.status, 'failed');
  assert.strictEqual(evidence.error, 'app /v1/unis returned HTTP 500');
  assert.deepStrictEqual(evidence.checks, [
    {
      label: 'app /healthz',
      url: 'https://app.example.com/healthz',
      statusCode: 200,
      outcome: 'passed'
    },
    {
      label: 'app /v1/unis',
      url: 'https://app.example.com/v1/unis',
      statusCode: 500,
      outcome: 'failed',
      error: 'app /v1/unis returned HTTP 500'
    }
  ]);
});

smoke.runChecks({
  UTOPLAN_APP_URL: 'https://user:secret@app.example.com/?token=secret'
}, function(url, callback) {
  callback(new Error(url + ' timed out'));
}, function(error, labels, evidence) {
  assert(error);
  assert.strictEqual(error.message, 'https://app.example.com/healthz timed out');
  assert.deepStrictEqual(labels, []);
  assert.strictEqual(JSON.stringify(evidence).includes('secret'), false);
});
