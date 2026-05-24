'use strict';

var http = require('http');
var https = require('https');
var URL = require('url').URL;

function parseUrl(value, name) {
  if (!value) {
    throw new Error(name + ' is required');
  }

  var parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(name + ' must use http or https');
  }

  return parsed;
}

function joinUrl(origin, path) {
  var base = origin.charAt(origin.length - 1) === '/' ? origin : origin + '/';
  return new URL(path.replace(/^\//, ''), base).toString();
}

function originFromUrl(url) {
  var parsed = new URL(url);
  return parsed.protocol + '//' + parsed.host;
}

function requestJson(url, options, callback) {
  var requestOptions = options || {};
  var parsed = new URL(url);
  var client = parsed.protocol === 'https:' ? https : http;
  var body = requestOptions.body || null;
  var headers = Object.assign({}, requestOptions.headers || {});
  var req;

  if (body && !headers['Content-Length']) {
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  if (typeof options === 'function') {
    callback = options;
    requestOptions = {};
    body = null;
    headers = {};
  }

  req = client.request({
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: requestOptions.method || 'GET',
    headers: headers
  }, function(response) {
    var chunks = [];

    response.on('data', function(chunk) {
      chunks.push(chunk);
    });

    response.on('end', function() {
      var body = Buffer.concat(chunks).toString();
      var json = null;

      try {
        json = body ? JSON.parse(body) : null;
      } catch (error) {
        return callback(new Error(url + ' did not return JSON'));
      }

      callback(null, {
        statusCode: response.statusCode,
        headers: response.headers,
        body: json
      });
    });
  });

  req.setTimeout(10000, function() {
    req.destroy(new Error(url + ' timed out'));
  });

  req.on('error', callback);

  if (body) {
    req.write(body);
  }

  req.end();
}

function checkStatus(result, expectedStatus, label) {
  if (result.statusCode !== expectedStatus) {
    throw new Error(label + ' returned HTTP ' + result.statusCode);
  }
}

function checkAppHealth(result) {
  checkStatus(result, 200, 'app /healthz');
  if (!result.body || result.body.status !== 'ok' || result.body.service !== 'utoplan-static-app') {
    throw new Error('app /healthz returned an unexpected payload');
  }
  if (result.body.apiProxy !== true || result.body.demoFixture !== false) {
    throw new Error('app /healthz must report proxy mode with fixture mode disabled');
  }
}

function checkUnis(result) {
  checkStatus(result, 200, 'app /v1/unis');
  if (!result.body || !result.body.meta || result.body.meta.error !== null || !Array.isArray(result.body.data)) {
    throw new Error('app /v1/unis returned an unexpected payload');
  }
}

function checkPlanningContext(result) {
  checkStatus(result, 200, 'app /v1/planning/context-demo');
  if (!result.body || result.body.scope !== 'puerto-rico-only' || result.body.mode !== 'demo-fixture') {
    throw new Error('app /v1/planning/context-demo returned an unexpected payload');
  }
  if (!result.body.selectedCategory || result.body.selectedCategory.id !== 'professional_services') {
    throw new Error('app /v1/planning/context-demo must include the demo business category');
  }
  if (!Array.isArray(result.body.facts) || result.body.facts.length === 0 || !Array.isArray(result.body.signals) || result.body.signals.length !== 0) {
    throw new Error('app /v1/planning/context-demo must return facts without scores or signals');
  }
}

function checkDemoSession(result) {
  checkStatus(result, 200, 'app /v1/demo/session');
  if (!result.body || result.body.scope !== 'puerto-rico-only' || result.body.mode !== 'demo-db-session') {
    throw new Error('app /v1/demo/session returned an unexpected payload');
  }
  if (!result.body.session || result.body.session.id !== 'demo-session-1') {
    throw new Error('app /v1/demo/session must include the seeded demo session');
  }
  if (!result.body.planningContext || result.body.planningContext.mode !== 'live-db') {
    throw new Error('app /v1/demo/session must include live planning context');
  }
}

function checkApiReady(result) {
  checkStatus(result, 200, 'api /readyz');
  if (!result.body || result.body.status !== 'ok' || result.body.database !== 'ok' || result.body.schema !== 'ok') {
    throw new Error('api /readyz returned an unexpected payload');
  }
}

function cookieFromSetCookie(result) {
  var setCookie = result.headers && result.headers['set-cookie'];
  var cookie;

  if (Array.isArray(setCookie)) {
    cookie = setCookie[0];
  } else {
    cookie = setCookie;
  }

  if (typeof cookie !== 'string' || cookie.indexOf('utoplan_anon_session=') !== 0) {
    throw new Error('anonymous create did not return the anonymous session cookie');
  }

  return cookie.split(';')[0];
}

function checkAnonymousCreate(result) {
  var body;

  checkStatus(result, 201, 'app /v1/anonymous-sessions');
  body = result.body && result.body.data && result.body.data[0];
  if (!body || typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
    throw new Error('app /v1/anonymous-sessions did not return a CSRF token');
  }
}

function checkAnonymousRead(result) {
  var body;

  checkStatus(result, 200, 'app /v1/profile');
  body = result.body && result.body.data && result.body.data[0];
  if (!body || !body.data || body.data.businessIdea !== 'Release smoke kiosk') {
    throw new Error('app /v1/profile did not return the anonymous smoke profile');
  }
}

function checkAnonymousUpdate(result) {
  var body;

  checkStatus(result, 200, 'app /v1/profile update');
  body = result.body && result.body.data && result.body.data[0];
  if (!body || !body.data || body.data.businessIdea !== 'Release smoke kiosk updated') {
    throw new Error('app /v1/profile update did not return the updated anonymous smoke profile');
  }
}

function checkAnonymousDelete(result) {
  checkStatus(result, 204, 'app /v1/profile delete');
}

function callRequester(requester, url, options, callback) {
  if (options) {
    requester(url, options, callback);
    return;
  }

  requester(url, callback);
}

function runChecks(env, requester, callback) {
  var appUrl;
  var apiUrl;
  var appOrigin;
  var checks;

  try {
    appUrl = parseUrl(env.UTOPLAN_APP_URL, 'UTOPLAN_APP_URL').toString();
    apiUrl = env.UTOPLAN_API_URL ? parseUrl(env.UTOPLAN_API_URL, 'UTOPLAN_API_URL').toString() : null;
    appOrigin = originFromUrl(appUrl);
  } catch (error) {
    callback(error);
    return;
  }

  checks = [
    {
      label: 'app /healthz',
      url: joinUrl(appUrl, '/healthz'),
      validate: checkAppHealth
    },
    {
      label: 'app /v1/unis',
      url: joinUrl(appUrl, '/v1/unis'),
      validate: checkUnis
    },
    {
      label: 'app /v1/planning/context-demo',
      url: joinUrl(appUrl, '/v1/planning/context-demo'),
      validate: checkPlanningContext
    }
  ];

  if (apiUrl) {
    checks.push({
      label: 'api /readyz',
      url: joinUrl(apiUrl, '/readyz'),
      validate: checkApiReady
    });
  }

  if (env.UTOPLAN_DEMO_SESSION_ID) {
    checks.push({
      label: 'app /v1/demo/session',
      url: joinUrl(appUrl, '/v1/demo/session?session=' + encodeURIComponent(env.UTOPLAN_DEMO_SESSION_ID)),
      validate: checkDemoSession
    });
  }

  function anonymousSmoke(labels) {
    var createBody = JSON.stringify({
      profile: {
        businessIdea: 'Release smoke kiosk'
      }
    });

    callRequester(requester, joinUrl(appUrl, '/v1/anonymous-sessions'), {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json'
      },
      body: createBody
    }, function(createError, createResult) {
      var csrfToken;
      var cookie;

      if (createError) {
        callback(createError);
        return;
      }

      try {
        checkAnonymousCreate(createResult);
        csrfToken = createResult.body.data[0].csrfToken;
        cookie = cookieFromSetCookie(createResult);
      } catch (validationError) {
        callback(validationError);
        return;
      }

      callRequester(requester, joinUrl(appUrl, '/v1/profile'), {
        headers: {
          Origin: appOrigin,
          Cookie: cookie
        }
      }, function(readError, readResult) {
        if (readError) {
          callback(readError);
          return;
        }

        try {
          checkAnonymousRead(readResult);
        } catch (readValidationError) {
          callback(readValidationError);
          return;
        }

        callRequester(requester, joinUrl(appUrl, '/v1/profile'), {
          method: 'PUT',
          headers: {
            Origin: appOrigin,
            Cookie: cookie,
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rowVersion: 1,
            profile: {
              businessIdea: 'Release smoke kiosk updated'
            }
          })
        }, function(updateError, updateResult) {
          if (updateError) {
            callback(updateError);
            return;
          }

          try {
            checkAnonymousUpdate(updateResult);
          } catch (updateValidationError) {
            callback(updateValidationError);
            return;
          }

          callRequester(requester, joinUrl(appUrl, '/v1/profile'), {
            method: 'DELETE',
            headers: {
              Origin: appOrigin,
              Cookie: cookie,
              'X-CSRF-Token': csrfToken
            }
          }, function(deleteError, deleteResult) {
            if (deleteError) {
              callback(deleteError);
              return;
            }

            try {
              checkAnonymousDelete(deleteResult);
            } catch (deleteValidationError) {
              callback(deleteValidationError);
              return;
            }

            callback(null, labels.concat([
              'app /v1/anonymous-sessions',
              'app /v1/profile anonymous read',
              'app /v1/profile anonymous update',
              'app /v1/profile anonymous delete'
            ]));
          });
        });
      });
    });
  }

  function next(index) {
    if (index >= checks.length) {
      if (env.UTOPLAN_ANONYMOUS_SMOKE === '1') {
        anonymousSmoke(checks.map(function(check) {
          return check.label;
        }));
        return;
      }

      callback(null, checks.map(function(check) {
        return check.label;
      }));
      return;
    }

    callRequester(requester, checks[index].url, null, function(error, result) {
      if (error) {
        callback(error);
        return;
      }

      try {
        checks[index].validate(result);
      } catch (validationError) {
        callback(validationError);
        return;
      }

      next(index + 1);
    });
  }

  next(0);
}

function main() {
  runChecks(process.env, requestJson, function(error, labels) {
    if (error) {
      console.error('Release smoke check failed: ' + error.message);
      process.exit(1);
      return;
    }

    console.error('Release smoke check passed: ' + labels.join(', '));
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  checkAnonymousCreate: checkAnonymousCreate,
  checkAnonymousDelete: checkAnonymousDelete,
  checkAnonymousRead: checkAnonymousRead,
  checkAnonymousUpdate: checkAnonymousUpdate,
  checkApiReady: checkApiReady,
  checkAppHealth: checkAppHealth,
  checkDemoSession: checkDemoSession,
  checkPlanningContext: checkPlanningContext,
  checkUnis: checkUnis,
  joinUrl: joinUrl,
  originFromUrl: originFromUrl,
  runChecks: runChecks
};
