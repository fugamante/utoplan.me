var assert = require('assert');
var childProcess = require('child_process');
var http = require('http');

var port = process.env.API_GATE_SMOKE_PORT || '18084';
var server;

function request(path) {
  return new Promise(function(resolve, reject) {
    var req = http.get({
      hostname: '127.0.0.1',
      port: port,
      path: path
    }, function(res) {
      res.resume();
      res.on('end', function() {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, function() {
      req.destroy(new Error('Timed out requesting ' + path));
    });
  });
}

function waitForServer(deadline) {
  return request('/').catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 100);
    }).then(function() {
      return waitForServer(deadline);
    });
  });
}

function stopServer() {
  if (server && !server.killed) {
    server.kill();
  }
}

async function main() {
  server = childProcess.spawn(process.execPath, ['app.js'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, { PORT: port }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  process.on('exit', stopServer);
  process.on('SIGINT', function() {
    stopServer();
    process.exit(130);
  });

  await waitForServer(Date.now() + 10000);

  var api = await request('/v1/unis');
  assert.strictEqual(api.statusCode, 404, 'API paths should not use fixture fallback without explicit demo mode');
}

main().then(function() {
  stopServer();
}).catch(function(error) {
  stopServer();
  console.error(error.stack || error.message);
  process.exit(1);
});
