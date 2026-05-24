'use strict';

var assert = require('assert');
var smoke = require('../scripts/release_smoke_check');

assert.strictEqual(smoke.joinUrl('https://app.example.com', '/healthz'), 'https://app.example.com/healthz');
assert.strictEqual(smoke.joinUrl('https://app.example.com/base/', '/v1/unis'), 'https://app.example.com/base/v1/unis');
assert.strictEqual(smoke.originFromUrl('https://app.example.com/base/'), 'https://app.example.com');

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
    scope: 'puerto-rico-only',
    mode: 'demo-fixture',
    selectedCategory: {
      id: 'professional_services'
    },
    facts: [{factType: 'establishment_count'}],
    signals: []
  }
});

smoke.checkDemoSession({
  statusCode: 200,
  body: {
    scope: 'puerto-rico-only',
    mode: 'demo-db-session',
    session: {
      id: 'demo-session-1'
    },
    planningContext: {
      mode: 'live-db'
    }
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

smoke.checkAnonymousCreate({
  statusCode: 201,
  headers: {
    'set-cookie': ['utoplan_anon_session=safe-token; HttpOnly']
  },
  body: {
    data: [{
      csrfToken: 'safe-csrf'
    }]
  }
});

smoke.checkAnonymousRead({
  statusCode: 200,
  body: {
    data: [{
      data: {
        businessIdea: 'Release smoke kiosk'
      }
    }]
  }
});

smoke.checkAnonymousUpdate({
  statusCode: 200,
  body: {
    data: [{
      data: {
        businessIdea: 'Release smoke kiosk updated'
      }
    }]
  }
});

smoke.checkAnonymousDelete({
  statusCode: 204,
  body: null
});

function requester(url, options, callback) {
  var requestOptions = options;
  var responses = {
    'https://app.example.com/healthz': {
      statusCode: 200,
      headers: {},
      body: {
        status: 'ok',
        service: 'utoplan-static-app',
        apiProxy: true,
        demoFixture: false
      }
    },
    'https://app.example.com/v1/unis': {
      statusCode: 200,
      headers: {},
      body: {
        meta: {
          error: null
        },
        data: [{id: 1}]
      }
    },
    'https://app.example.com/v1/planning/context-demo': {
      statusCode: 200,
      headers: {},
      body: {
        scope: 'puerto-rico-only',
        mode: 'demo-fixture',
        selectedCategory: {
          id: 'professional_services'
        },
        facts: [{factType: 'establishment_count'}],
        signals: []
      }
    },
    'https://app.example.com/v1/demo/session?session=demo-session-1': {
      statusCode: 200,
      headers: {},
      body: {
        scope: 'puerto-rico-only',
        mode: 'demo-db-session',
        session: {
          id: 'demo-session-1'
        },
        planningContext: {
          mode: 'live-db'
        }
      }
    },
    'https://api.example.internal/readyz': {
      statusCode: 200,
      headers: {},
      body: {
        status: 'ok',
        database: 'ok',
        schema: 'ok'
      }
    }
  };

  if (typeof options === 'function') {
    callback = options;
    requestOptions = {};
  }

  if (url === 'https://app.example.com/v1/anonymous-sessions') {
    assert.strictEqual(requestOptions.method, 'POST');
    assert.strictEqual(requestOptions.headers.Origin, 'https://app.example.com');
    assert.strictEqual(JSON.parse(requestOptions.body).profile.businessIdea, 'Release smoke kiosk');
    callback(null, {
      statusCode: 201,
      headers: {
        'set-cookie': ['utoplan_anon_session=safe-token; HttpOnly']
      },
      body: {
        data: [{
          csrfToken: 'safe-csrf'
        }]
      }
    });
    return;
  }

  if (url === 'https://app.example.com/v1/profile' && requestOptions.method === 'PUT') {
    assert.strictEqual(requestOptions.headers.Cookie, 'utoplan_anon_session=safe-token');
    assert.strictEqual(requestOptions.headers['X-CSRF-Token'], 'safe-csrf');
    assert.strictEqual(JSON.parse(requestOptions.body).profile.businessIdea, 'Release smoke kiosk updated');
    callback(null, {
      statusCode: 200,
      headers: {},
      body: {
        data: [{
          data: {
            businessIdea: 'Release smoke kiosk updated'
          }
        }]
      }
    });
    return;
  }

  if (url === 'https://app.example.com/v1/profile' && requestOptions.method === 'DELETE') {
    assert.strictEqual(requestOptions.headers.Cookie, 'utoplan_anon_session=safe-token');
    assert.strictEqual(requestOptions.headers['X-CSRF-Token'], 'safe-csrf');
    callback(null, {
      statusCode: 204,
      headers: {},
      body: null
    });
    return;
  }

  if (url === 'https://app.example.com/v1/profile') {
    assert.strictEqual(requestOptions.headers.Cookie, 'utoplan_anon_session=safe-token');
    callback(null, {
      statusCode: 200,
      headers: {},
      body: {
        data: [{
          data: {
            businessIdea: 'Release smoke kiosk'
          }
        }]
      }
    });
    return;
  }

  callback(null, responses[url]);
}

smoke.runChecks({
  UTOPLAN_APP_URL: 'https://app.example.com',
  UTOPLAN_API_URL: 'https://api.example.internal',
  UTOPLAN_DEMO_SESSION_ID: 'demo-session-1'
}, requester, function(error, labels) {
  assert.ifError(error);
  assert.deepStrictEqual(labels, [
    'app /healthz',
    'app /v1/unis',
    'app /v1/planning/context-demo',
    'api /readyz',
    'app /v1/demo/session'
  ]);
});

smoke.runChecks({
  UTOPLAN_APP_URL: 'https://app.example.com',
  UTOPLAN_ANONYMOUS_SMOKE: '1'
}, requester, function(error, labels) {
  assert.ifError(error);
  assert.deepStrictEqual(labels, [
    'app /healthz',
    'app /v1/unis',
    'app /v1/planning/context-demo',
    'app /v1/anonymous-sessions',
    'app /v1/profile anonymous read',
    'app /v1/profile anonymous update',
    'app /v1/profile anonymous delete'
  ]);
});

smoke.runChecks({}, requester, function(error) {
  assert(error);
  assert.strictEqual(error.message, 'UTOPLAN_APP_URL is required');
});
