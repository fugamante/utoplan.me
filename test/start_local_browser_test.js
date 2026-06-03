'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const http = require('http');
const {chromium} = require('@playwright/test');

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

function waitFor(port, path, deadline) {
  return request(port, path).then(function(response) {
    if (response.statusCode !== 200) {
      throw new Error(path + ' returned HTTP ' + response.statusCode);
    }

    return response;
  }).catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 250);
    }).then(function() {
      return waitFor(port, path, deadline);
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

function startLocal(apiPort, appPort) {
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
}

async function main() {
  const apiPort = process.env.START_LOCAL_BROWSER_API_PORT || '18086';
  const appPort = process.env.START_LOCAL_BROWSER_APP_PORT || '18087';
  const baseUrl = 'http://127.0.0.1:' + appPort;
  const requestedPaths = [];
  const tilePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64'
  );

  startLocal(apiPort, appPort);
  await waitFor(appPort, '/', Date.now() + 30000);
  await waitFor(apiPort, '/v1/unis', Date.now() + 30000);

  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1280, height: 720}});
  const consoleMessages = [];
  const pageErrors = [];

  await page.route('https://tile.openstreetmap.org/**', function(route) {
    route.fulfill({
      body: tilePng,
      contentType: 'image/png',
      status: 200
    });
  });

  page.on('console', function(message) {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(message.type() + ': ' + message.text());
    }
  });
  page.on('pageerror', function(error) {
    pageErrors.push(error.message);
  });
  page.on('request', function(request) {
    requestedPaths.push(new URL(request.url()).pathname);
  });

  await page.goto(baseUrl, {waitUntil: 'networkidle'});

  assert.strictEqual(await page.locator('[data-map="main"]').count(), 1, 'map container should render');
  assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 1, 'API-backed university marker should render');
  assert.strictEqual(await page.locator('.leaflet-popup-content').textContent(), 'Contract University18.42,-66.06');
  await page.waitForSelector('[data-ui="planning-context-detail"] .planningContextSection');
  assert(
    (await page.locator('[data-ui="planning-context-detail"]').innerText()).indexOf('Unresolved questions') !== -1,
    'page should render planning-context detail from the real same-origin API path'
  );
  assert(requestedPaths.includes('/v1/unis'), 'browser should request the same-origin modern API collection');
  assert(requestedPaths.includes('/v1/planning-context'), 'browser should request planning-context summaries');
  assert(requestedPaths.includes('/v1/planning-context/mun001_construction'), 'browser should request planning-context detail');
  assert(!requestedPaths.includes('/data/unis.json'), 'browser should not fetch the offline fixture');
  assert.deepStrictEqual(pageErrors, [], 'page should not throw runtime errors');
  assert.deepStrictEqual(consoleMessages, [], 'page should not log browser console errors or warnings');

  await browser.close();
  stopLocal();
}

process.on('exit', stopLocal);
process.on('SIGINT', function() {
  stopLocal();
  process.exit(130);
});

main().catch(function(error) {
  stopLocal();
  console.error(error.stack || error.message);
  process.exit(1);
});
