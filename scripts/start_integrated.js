'use strict';

var childProcess = require('child_process');

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function buildConfig(env) {
  var apiPort = env.UTOPLAN_API_PORT || '3001';
  var appPort = env.UTOPLAN_APP_PORT || '8080';
  var apiOrigin = env.UTOPLAN_API_ORIGIN || 'http://127.0.0.1:' + apiPort;

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
    apiOrigin: apiOrigin
  };
}

function spawnService(service) {
  return childProcess.spawn(service.command, service.args, {
    env: service.env,
    stdio: 'inherit'
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

  console.error('Starting static app at ' + config.appUrl);
  children.push(spawnService(config.app));

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
