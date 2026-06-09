var assert = require('assert');
var childProcess = require('child_process');
var http = require('http');

var appPort = process.env.PROXY_SMOKE_APP_PORT || '18082';
var apiPort = process.env.PROXY_SMOKE_API_PORT || '18081';
var appServer;
var apiServer;

function request(port, path) {
  return new Promise(function(resolve, reject) {
    var req = http.get({
      hostname: '127.0.0.1',
      port: port,
      path: path
    }, function(res) {
      var chunks = [];

      res.on('data', function(chunk) {
        chunks.push(chunk);
      });

      res.on('end', function() {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, function() {
      req.destroy(new Error('Timed out requesting ' + path));
    });
  });
}

function waitForApp(deadline) {
  return request(appPort, '/').catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 100);
    }).then(function() {
      return waitForApp(deadline);
    });
  });
}

function stopServers() {
  if (appServer && !appServer.killed) {
    appServer.kill();
  }

  if (apiServer) {
    apiServer.close();
  }
}

function createApiServer() {
  return http.createServer(function(request, response) {
    if (request.url.split('?')[0] !== '/v1/unis') {
      response.writeHead(404, {
        'Content-Type': 'application/json; charset=utf-8'
      });
      response.end(JSON.stringify({error: 'not_found'}));
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Test-Proxy': 'modern-api'
    });
    response.end(JSON.stringify({
      meta: {
        total: 1,
        count: 1,
        offset: 0,
        error: null
      },
      data: [{
        id: 1,
        title: 'Proxied University',
        lat: 18.42,
        long: -66.06
      }]
    }));
  });
}

async function main() {
  apiServer = createApiServer();

  await new Promise(function(resolve, reject) {
    apiServer.on('error', reject);
    apiServer.listen(Number(apiPort), '127.0.0.1', resolve);
  });

  appServer = childProcess.spawn(process.execPath, ['app.js'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, {
      PORT: appPort,
      UTOPLAN_API_ORIGIN: 'http://127.0.0.1:' + apiPort
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  appServer.on('exit', function(code, signal) {
    if (code && code !== 0) {
      console.error('Static app exited with code ' + code + ' signal ' + signal);
    }
  });

  process.on('exit', stopServers);
  process.on('SIGINT', function() {
    stopServers();
    process.exit(130);
  });

  await waitForApp(Date.now() + 10000);

  var health = await request(appPort, '/healthz');
  var healthBody = JSON.parse(health.body.toString('utf8'));
  assert.strictEqual(health.statusCode, 200, 'proxied app health check should return HTTP 200');
  assert.strictEqual(health.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(healthBody.apiProxy, true);
  assert.strictEqual(healthBody.demoFixture, false);

  var proxied = await request(appPort, '/v1/unis');
  var body = JSON.parse(proxied.body.toString('utf8'));

  assert.strictEqual(proxied.statusCode, 200, 'proxied API request should return HTTP 200');
  assert.strictEqual(proxied.headers['x-test-proxy'], 'modern-api');
  assert.strictEqual(body.data[0].title, 'Proxied University');
}

main().then(function() {
  stopServers();
}).catch(function(error) {
  stopServers();
  console.error(error.stack || error.message);
  process.exit(1);
});
