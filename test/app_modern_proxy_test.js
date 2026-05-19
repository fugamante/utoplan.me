'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const http = require('http');

const db = require('../dtoapi/modern/lib/db');
const modernApi = require('../dtoapi/modern/lib/server');

let apiServer;
let appServer;

function request(port, path) {
  return new Promise(function(resolve, reject) {
    const req = http.get({
      hostname: '127.0.0.1',
      port: port,
      path: path
    }, function(response) {
      const chunks = [];

      response.on('data', function(chunk) {
        chunks.push(chunk);
      });

      response.on('end', function() {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, function() {
      req.destroy(new Error('Timed out requesting ' + path));
    });
  });
}

function listen(server) {
  return new Promise(function(resolve, reject) {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', function() {
      resolve(server.address().port);
    });
  });
}

function waitForApp(port, deadline) {
  return request(port, '/').catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 100);
    }).then(function() {
      return waitForApp(port, deadline);
    });
  });
}

function closeApi() {
  return new Promise(function(resolve) {
    if (!apiServer) {
      resolve();
      return;
    }

    apiServer.close(function() {
      db.close(function() {
        resolve();
      });
    });
  });
}

function stopApp() {
  if (appServer && !appServer.killed) {
    appServer.kill();
  }
}

async function cleanup() {
  stopApp();
  await closeApi();
}

async function main() {
  apiServer = modernApi.createServer();
  const apiPort = await listen(apiServer);
  const appPort = process.env.PROXY_APP_PORT || '18083';

  appServer = childProcess.spawn(process.execPath, ['app.js'], {
    cwd: __dirname + '/../app',
    env: Object.assign({}, process.env, {
      PORT: appPort,
      UTOPLAN_API_ORIGIN: 'http://127.0.0.1:' + apiPort
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  appServer.stderr.on('data', function(chunk) {
    process.stderr.write(chunk);
  });

  await waitForApp(appPort, Date.now() + 10000);

  const response = await request(appPort, '/v1/unis');
  const body = JSON.parse(response.body);

  assert.strictEqual(response.statusCode, 200, 'proxied modern API request should return HTTP 200');
  assert.strictEqual(response.headers['x-powered-by'], 'utoplan-modern-api');
  assert.strictEqual(body.meta.error, null);
  assert.strictEqual(body.meta.count, 1);
  assert.strictEqual(body.data[0].title, 'Contract University');
  assert.notStrictEqual(body.data[0].title, 'University of Puerto Rico');
}

process.on('exit', stopApp);
process.on('SIGINT', function() {
  cleanup().then(function() {
    process.exit(130);
  });
});

main().then(function() {
  return cleanup();
}).catch(function(error) {
  cleanup().then(function() {
    console.error(error.stack || error.message);
    process.exit(1);
  });
});
