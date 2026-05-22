'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const http = require('http');

let localServer;

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

function waitForProxy(port, deadline) {
  return request(port, '/v1/unis').then(function(response) {
    if (response.statusCode !== 200) {
      throw new Error('Proxy returned HTTP ' + response.statusCode);
    }

    return response;
  }).catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 250);
    }).then(function() {
      return waitForProxy(port, deadline);
    });
  });
}

function waitForApi(port, deadline) {
  return request(port, '/v1/unis').then(function(response) {
    if (response.statusCode !== 200) {
      throw new Error('API returned HTTP ' + response.statusCode);
    }

    return response;
  }).catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 250);
    }).then(function() {
      return waitForApi(port, deadline);
    });
  });
}

function stopLocal() {
  if (localServer && !localServer.killed) {
    if (process.platform === 'win32') {
      localServer.kill();
      return;
    }

    try {
      process.kill(-localServer.pid, 'SIGTERM');
    } catch (error) {
      localServer.kill();
    }
  }
}

async function main() {
  const apiPort = process.env.PROXY_API_PORT || '18085';
  const appPort = process.env.PROXY_APP_PORT || '18083';

  localServer = childProcess.spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start:local'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, {
      UTOPLAN_API_PORT: apiPort,
      UTOPLAN_APP_PORT: appPort
    }),
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  localServer.stdout.on('data', function(chunk) {
    process.stderr.write(chunk);
  });
  localServer.stderr.on('data', function(chunk) {
    process.stderr.write(chunk);
  });

  await waitForApp(appPort, Date.now() + 30000);
  await waitForApi(apiPort, Date.now() + 30000);

  const response = await waitForProxy(appPort, Date.now() + 30000);
  const body = JSON.parse(response.body);

  assert.strictEqual(response.statusCode, 200, 'proxied modern API request should return HTTP 200');
  assert.strictEqual(response.headers['x-powered-by'], 'utoplan-modern-api');
  assert.strictEqual(body.meta.error, null);
  assert.strictEqual(body.meta.count, 1);
  assert.strictEqual(body.data[0].title, 'Contract University');
  assert.notStrictEqual(body.data[0].title, 'University of Puerto Rico');
}

process.on('exit', stopLocal);
process.on('SIGINT', function() {
  stopLocal();
  process.exit(130);
});

main().then(function() {
  stopLocal();
}).catch(function(error) {
  stopLocal();
  console.error(error.stack || error.message);
  process.exit(1);
});
