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

function sanitizeUrl(url) {
  var parsed = new URL(url);
  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function sanitizeRequestError(error, url) {
  var message = error && error.message ? error.message : 'request failed';
  return message.split(url).join(sanitizeUrl(url));
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
  checkStatus(result, 200, 'app /v1/planning-context');
  if (
    !result.body ||
    !result.body.meta ||
    result.body.meta.error !== null ||
    !Array.isArray(result.body.data)
  ) {
    throw new Error('app /v1/planning-context returned an unexpected payload');
  }

  if (result.body.data.length === 0) {
    throw new Error('app /v1/planning-context returned no summaries');
  }

  result.body.data.forEach(function(summary, index) {
    if (!summary || !summary.guardrails) {
      throw new Error('app /v1/planning-context summary ' + index + ' is missing guardrails');
    }

    if (
      summary.guardrails.descriptiveOnly !== true ||
      summary.guardrails.noScores !== true ||
      summary.guardrails.noRankings !== true ||
      summary.guardrails.noRecommendations !== true
    ) {
      throw new Error('app /v1/planning-context summary ' + index + ' returned unexpected guardrails');
    }
  });
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
  var results = [];

  try {
    appUrl = parseUrl(env.UTOPLAN_APP_URL, 'UTOPLAN_APP_URL').toString();
    apiUrl = env.UTOPLAN_API_URL ? parseUrl(env.UTOPLAN_API_URL, 'UTOPLAN_API_URL').toString() : null;
  } catch (error) {
    callback(error, [], {
      schemaVersion: 1,
      status: 'failed',
      checks: [],
      error: error.message
    });
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
      label: 'app /v1/planning-context',
      url: joinUrl(appUrl, '/v1/planning-context'),
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
      }), {
        schemaVersion: 1,
        status: 'passed',
        checks: results
      });
      return;
    }

    requester(checks[index].url, function(error, result) {
      if (error) {
        var safeError = new Error(sanitizeRequestError(error, checks[index].url));
        results.push({
          label: checks[index].label,
          url: sanitizeUrl(checks[index].url),
          statusCode: null,
          outcome: 'failed',
          error: safeError.message
        });
        callback(safeError, checks.slice(0, index).map(function(check) {
          return check.label;
        }), {
          schemaVersion: 1,
          status: 'failed',
          checks: results,
          error: safeError.message
        });
        return;
      }

      try {
        checks[index].validate(result);
      } catch (validationError) {
        results.push({
          label: checks[index].label,
          url: sanitizeUrl(checks[index].url),
          statusCode: result && typeof result.statusCode === 'number' ? result.statusCode : null,
          outcome: 'failed',
          error: validationError.message
        });
        callback(validationError, checks.slice(0, index).map(function(check) {
          return check.label;
        }), {
          schemaVersion: 1,
          status: 'failed',
          checks: results,
          error: validationError.message
        });
        return;
      }

      results.push({
        label: checks[index].label,
        url: sanitizeUrl(checks[index].url),
        statusCode: result && typeof result.statusCode === 'number' ? result.statusCode : null,
        outcome: 'passed'
      });
      next(index + 1);
    });
  }

  next(0);
}

function main() {
  var jsonOutput = process.env.UTOPLAN_RELEASE_SMOKE_JSON === '1';

  runChecks(process.env, requestJson, function(error, labels, evidence) {
    if (error) {
      if (jsonOutput && evidence) {
        console.log(JSON.stringify(evidence, null, 2));
      }
      console.error('Release smoke check failed: ' + error.message);
      process.exit(1);
      return;
    }

    if (jsonOutput) {
      console.log(JSON.stringify(evidence, null, 2));
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
  runChecks: runChecks,
  sanitizeRequestError: sanitizeRequestError,
  sanitizeUrl: sanitizeUrl
};
