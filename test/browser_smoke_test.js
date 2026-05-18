const assert = require('assert');
const childProcess = require('child_process');
const { chromium } = require('@playwright/test');

const port = process.env.BROWSER_SMOKE_PORT || '18082';
const baseUrl = `http://127.0.0.1:${port}`;
let server;

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

async function main() {
  startServer();
  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });

  await waitForServer(Date.now() + 10000);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  assert.strictEqual(await page.title(), 'Utoplan.me - Modular data visualizer for strategic planning.');
  assert.strictEqual(await page.locator('[data-map="main"]').count(), 1, 'map container should render');
  assert.strictEqual(await page.locator('[data-ui="layer-menu"] li').count(), 10, 'layer menu should render expected entries');
  assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 1, 'local university marker should render');
  await assertVisible(page, '#layersMenu', 'layer menu should be visible');
  await waitForDisplay(page, '[data-ui="sidebar"]', 'none');
  await assertHidden(page, '[data-ui="sidebar"]', 'sidebar should start hidden');

  await page.locator('[data-ui="layer-menu-toggle"]').click();
  await waitForDisplay(page, '[data-ui="layer-menu"]', 'none');
  await assertHidden(page, '[data-ui="layer-menu"]', 'layer list should hide after dropdown click');
  await page.locator('[data-ui="layer-menu-toggle"]').click();
  await waitForDisplay(page, '[data-ui="layer-menu"]', 'block');
  assert.strictEqual(await getDisplay(page, '[data-ui="layer-menu"]'), 'block', 'layer list should show after second dropdown click');

  await page.locator('[data-ui="sidebar-toggle"]').click();
  await waitForDisplay(page, '[data-ui="sidebar"]', 'block');
  assert.strictEqual(await getDisplay(page, '[data-ui="sidebar"]'), 'block', 'sidebar should show after toggle click');
  await page.locator('[data-ui="sidebar-toggle"]').click();
  await waitForDisplay(page, '[data-ui="sidebar"]', 'none');
  await assertHidden(page, '[data-ui="sidebar"]', 'sidebar should hide after second toggle click');

  await page.locator('[data-ui="layer-visibility"].eyeClosed').first().click();
  assert(
    await page.locator('[data-ui="layer-visibility"].eyeOpened').count() >= 2,
    'layer eye click should open an additional layer icon'
  );

  assert.deepStrictEqual(pageErrors, [], 'page should not throw runtime errors');
  assert.deepStrictEqual(consoleMessages, [], 'page should not log browser console errors or warnings');

  await browser.close();
  stopServer();
}

async function assertVisible(page, selector, message) {
  const visible = await page.locator(selector).isVisible();
  assert.strictEqual(visible, true, message);
}

async function assertHidden(page, selector, message) {
  const visible = await page.locator(selector).isVisible();
  assert.strictEqual(visible, false, message);
}

async function waitForDisplay(page, selector, display) {
  await page.waitForFunction(
    ({ selector: target, display: expected }) => {
      const element = document.querySelector(target);
      return element && getComputedStyle(element).display === expected;
    },
    { selector, display },
    { timeout: 3000 }
  );
}

async function getDisplay(page, selector) {
  return page.locator(selector).evaluate(element => getComputedStyle(element).display);
}

main().catch(error => {
  stopServer();
  console.error(error.stack || error.message);
  process.exit(1);
});
