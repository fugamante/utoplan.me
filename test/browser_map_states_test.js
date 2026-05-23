const assert = require('assert');
const childProcess = require('child_process');
const { chromium } = require('@playwright/test');

const port = process.env.BROWSER_MAP_STATES_PORT || '18090';
const baseUrl = `http://127.0.0.1:${port}`;
let server;

const tilePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

function startServer() {
  server = childProcess.spawn(process.execPath, ['app.js'], {
    cwd: `${__dirname}/../app`,
    env: Object.assign({}, process.env, { PORT: port }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stderr.on('data', chunk => {
    process.stderr.write(chunk);
  });
}

function stopServer() {
  if (server && !server.killed) {
    server.kill();
  }
}

async function waitForServer(deadline) {
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      return;
    }
  } catch (error) {
    if (Date.now() > deadline) {
      throw error;
    }
  }

  if (Date.now() > deadline) {
    throw new Error('Timed out waiting for static app server');
  }

  await new Promise(resolve => setTimeout(resolve, 100));
  await waitForServer(deadline);
}

async function routeMapAssets(page) {
  await page.route('https://tile.openstreetmap.org/**', route => {
    route.fulfill({
      body: tilePng,
      contentType: 'image/png',
      status: 200
    });
  });
}

async function runFallbackScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const requestedPaths = [];
  const warnings = [];
  const pageErrors = [];

  page.on('request', request => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type()) && !isExpectedNetworkError(message.text())) {
      warnings.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await routeMapAssets(page);
  await page.route(`${baseUrl}/v1/unis`, route => {
    route.fulfill({
      body: JSON.stringify({ error: 'api unavailable' }),
      contentType: 'application/json',
      status: 503
    });
  });
  await page.route(`${baseUrl}/data/unis.json`, route => {
    route.fulfill({
      body: JSON.stringify({
        meta: {
          total: 1,
          count: 1,
          offset: 0,
          error: null
        },
        data: [{
          id: 20,
          title: 'Fallback University',
          address: '200 Offline Ave',
          desc: 'Offline row',
          lat: 18.41,
          long: -66.07
        }]
      }),
      contentType: 'application/json',
      status: 200
    });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const status = page.locator('[data-map-status="main"]');
  assert.strictEqual(await status.getAttribute('data-state'), 'fallback');
  assert.strictEqual(await status.textContent(), 'Using offline university data while the API is unavailable.');
  assert.strictEqual(await status.isVisible(), true, 'fallback status should be visible');
  assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 1, 'fallback marker should render');
  assert(requestedPaths.includes('/v1/unis'), 'map should request the API before fallback');
  assert(requestedPaths.includes('/data/unis.json'), 'map should request fallback data after API failure');
  assert.deepStrictEqual(pageErrors, [], 'fallback page should not throw runtime errors');
  assert.deepStrictEqual(warnings, [], 'fallback page should not log browser console errors or warnings');

  await page.close();
}

async function runErrorScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const requestedPaths = [];
  const warnings = [];
  const pageErrors = [];

  page.on('request', request => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type()) && !isExpectedNetworkError(message.text())) {
      warnings.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await routeMapAssets(page);
  await page.route(`${baseUrl}/v1/unis`, route => {
    route.fulfill({
      body: JSON.stringify({ error: 'api unavailable' }),
      contentType: 'application/json',
      status: 503
    });
  });
  await page.route(`${baseUrl}/data/unis.json`, route => {
    route.fulfill({
      body: JSON.stringify({ error: 'fallback unavailable' }),
      contentType: 'application/json',
      status: 503
    });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const status = page.locator('[data-map-status="main"]');
  assert.strictEqual(await status.getAttribute('data-state'), 'error');
  assert.strictEqual(await status.textContent(), 'University data is unavailable. The map is loaded without university markers.');
  assert.strictEqual(await status.isVisible(), true, 'error status should be visible');
  assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 0, 'no marker should render without data');
  assert(requestedPaths.includes('/v1/unis'), 'map should request the API before error state');
  assert(requestedPaths.includes('/data/unis.json'), 'map should request fallback data before error state');
  assert.deepStrictEqual(pageErrors, [], 'error page should not throw runtime errors');
  assert.deepStrictEqual(warnings, [], 'error page should not log browser console errors or warnings');

  await page.close();
}

function isExpectedNetworkError(message) {
  return message.indexOf('Failed to load resource: the server responded with a status of 503') !== -1;
}

async function main() {
  startServer();
  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });

  await waitForServer(Date.now() + 10000);

  const browser = await chromium.launch();
  try {
    await runFallbackScenario(browser);
    await runErrorScenario(browser);
  } finally {
    await browser.close();
    stopServer();
  }
}

main().catch(error => {
  stopServer();
  console.error(error.stack || error.message);
  process.exit(1);
});
