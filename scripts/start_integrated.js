'use strict';

var childProcess = require('child_process');
var http = require('http');
var https = require('https');
var URL = require('url').URL;

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function buildConfig(env) {
  var apiPort = env.UTOPLAN_API_PORT || '3001';
  var appPort = env.UTOPLAN_APP_PORT || '8080';
  var apiOrigin = env.UTOPLAN_API_ORIGIN || 'http://127.0.0.1:' + apiPort;
  var readyTimeoutMs = Number(env.UTOPLAN_START_READY_TIMEOUT_MS || 60000);

  return {
    api: {
      command: npmCommand(),
      args: ['--prefix', 'dtoapi', 'run', 'start:modern'],
      env: Object.assign({}, env, {
        PORT: apiPort
      })
    },
    app: {
      command: npmCommand(),
      args: ['--prefix', 'app', 'start'],
      env: Object.assign({}, env, {
        PORT: appPort,
        UTOPLAN_API_ORIGIN: apiOrigin
      })
    },
    appUrl: 'http://127.0.0.1:' + appPort,
    apiOrigin: apiOrigin,
    apiReadyUrl: new URL('/readyz', apiOrigin).toString(),
    readyTimeoutMs: Number.isFinite(readyTimeoutMs) && readyTimeoutMs > 0 ? readyTimeoutMs : 60000
  };
}

function spawnService(service) {
  return childProcess.spawn(service.command, service.args, {
    env: service.env,
    stdio: 'inherit'
  });
}

function requestStatus(url, callback) {
  var parsed = new URL(url);
  var client = parsed.protocol === 'https:' ? https : http;
  var req = client.get(parsed, function(response) {
    response.resume();
    response.on('end', function() {
      callback(null, response.statusCode);
    });
  });

  req.setTimeout(5000, function() {
    req.destroy(new Error('Timed out waiting for ' + url));
  });
  req.on('error', callback);
}

function waitForReady(url, deadline) {
  return new Promise(function(resolve, reject) {
    function poll() {
      requestStatus(url, function(error, statusCode) {
        if (!error && statusCode === 200) {
          resolve();
          return;
        }

        if (Date.now() >= deadline) {
          reject(error || new Error(url + ' returned HTTP ' + statusCode));
          return;
        }

        setTimeout(poll, 250);
      });
    }

    poll();
  });
}

function start(env) {
  var config = buildConfig(env || process.env);
  var children = [];
  var shuttingDown = false;

  function stopAll(code) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    children.forEach(function(child) {
      if (!child.killed) {
        child.kill();
      }
    });

    if (typeof code === 'number') {
      process.exitCode = code;
    }
  }

  console.error('Starting modern API at ' + config.apiOrigin);
  children.push(spawnService(config.api));

  children.forEach(function(child) {
    child.on('exit', function(code, signal) {
      if (!shuttingDown && (code || signal)) {
        console.error('Integrated service exited: code=' + code + ' signal=' + signal);
        stopAll(code || 1);
      }
    });
  });

  process.on('SIGINT', function() {
    stopAll(130);
  });
  process.on('SIGTERM', function() {
    stopAll(143);
  });

  waitForReady(config.apiReadyUrl, Date.now() + config.readyTimeoutMs).then(function() {
    if (shuttingDown) {
      return;
    }

    console.error('API readiness verified at ' + config.apiReadyUrl);
    console.error('Starting static app at ' + config.appUrl);
    children.push(spawnService(config.app));
    children[children.length - 1].on('exit', function(code, signal) {
      if (!shuttingDown && (code || signal)) {
        console.error('Integrated service exited: code=' + code + ' signal=' + signal);
        stopAll(code || 1);
      }
    });
  }).catch(function(error) {
    console.error('Integrated startup failed waiting for API readiness: ' + error.message);
    stopAll(1);
  });

  return {
    config: config,
    children: children,
    stop: stopAll
  };
}

if (require.main === module) {
  start(process.env);
}

module.exports = {
  buildConfig: buildConfig,
  start: start
};
