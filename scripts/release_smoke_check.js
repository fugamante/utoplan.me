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

function requestJson(url, callback) {
  var parsed = new URL(url);
  var client = parsed.protocol === 'https:' ? https : http;
  var req = client.get(parsed, function(response) {
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
        body: json
      });
    });
  });

  req.setTimeout(10000, function() {
    req.destroy(new Error(url + ' timed out'));
  });

  req.on('error', callback);
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

function checkApiReady(result) {
  checkStatus(result, 200, 'api /readyz');
  if (!result.body || result.body.status !== 'ok' || result.body.database !== 'ok' || result.body.schema !== 'ok') {
    throw new Error('api /readyz returned an unexpected payload');
  }
}

function runChecks(env, requester, callback) {
  var appUrl;
  var apiUrl;
  var checks;

  try {
    appUrl = parseUrl(env.UTOPLAN_APP_URL, 'UTOPLAN_APP_URL').toString();
    apiUrl = env.UTOPLAN_API_URL ? parseUrl(env.UTOPLAN_API_URL, 'UTOPLAN_API_URL').toString() : null;
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

  function next(index) {
    if (index >= checks.length) {
      callback(null, checks.map(function(check) {
        return check.label;
      }));
      return;
    }

    requester(checks[index].url, function(error, result) {
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
  checkApiReady: checkApiReady,
  checkAppHealth: checkAppHealth,
  checkPlanningContext: checkPlanningContext,
  checkUnis: checkUnis,
  joinUrl: joinUrl,
  runChecks: runChecks
};
