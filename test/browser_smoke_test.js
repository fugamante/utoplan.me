const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const port = process.env.BROWSER_SMOKE_PORT || '18082';
const baseUrl = `http://127.0.0.1:${port}`;
const generatedUnis = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'generated', 'unis-partial-import.json'), 'utf8'));
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
  const requestedPaths = [];
  const tilePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64'
  );

  await page.route('https://tile.openstreetmap.org/**', route => {
    route.fulfill({
      body: tilePng,
      contentType: 'image/png',
      status: 200
    });
  });
  await page.route(`${baseUrl}/v1/unis`, route => {
    route.fulfill({
      body: JSON.stringify({
        meta: {
          total: generatedUnis.rows.length,
          count: generatedUnis.rows.length,
          offset: 0,
          error: null,
          coverage: {
            status: 'partial',
            boundaryDecision: 'accept-partial-import',
            coverageLabel: 'Partial reviewed Census-cache coverage: 4 included rows, 42 reviewed exclusions.',
            reviewedCacheRows: 4,
            approvedRows: 19,
            geocoderQuarantinedApprovedRows: 15,
            identityQuarantinedRows: 27,
            reviewedRowsAccountedFor: 46,
            includedRows: 4,
            excludedRows: 42,
            cacheArtifactPath: 'data/geocoding/unis-census-geocoder-cache.json',
            quarantineArtifactPath: 'data/geocoding/unis-import-quarantine.json',
            importBoundaryArtifactPath: 'data/geocoding/unis-import-boundary-review.json',
            limitations: [
              'The /v1/unis collection may contain only the reviewed Census-cache-backed subset from the accepted partial import boundary; it is not complete Puerto Rico higher-education coverage.',
              'Excluded rows remain outside production-style unis output until corrected address evidence or row-level authority review changes their status.'
            ]
          }
        },
        data: generatedUnis.rows.map(row => ({
          id: row.id,
          title: row.title,
          address: row.address,
          desc: row.desc,
          lat: row.lat,
          long: row.long
        }))
      }),
      contentType: 'application/json',
      status: 200
    });
  });
  await page.route(`${baseUrl}/v1/planning-context`, route => {
    route.fulfill({
      body: JSON.stringify({
        meta: {
          total: 2,
          count: 2,
          offset: 0,
          error: null
        },
        data: [{
          id: 'mun001_construction',
          municipality: {
            code: '001',
            label: 'Adjuntas'
          },
          businessCategory: {
            id: 'construction-service',
            displayName: 'Construction service'
          },
          confidence: {
            overall: 'low'
          },
          guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
          }
        }, {
          id: 'mun003_restaurant',
          municipality: {
            code: '003',
            label: 'Aguada'
          },
          businessCategory: {
            id: 'restaurant-cafe',
            displayName: 'Restaurant or cafe'
          },
          confidence: {
            overall: 'medium'
          },
          guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
          }
        }]
      }),
      contentType: 'application/json',
      status: 200
    });
  });
  await page.route(`${baseUrl}/v1/planning-context/**`, route => {
    const detailId = route.request().url().split('/').pop();
    const detailPayloads = {
      mun001_construction: {
        meta: {
          total: 1,
          count: 1,
          offset: 0,
          error: null
        },
        data: [{
          id: 'mun001_construction',
          municipality: {
            code: '001',
            label: 'Adjuntas'
          },
          businessCategory: {
            id: 'construction-service',
            displayName: 'Construction service'
          },
          confidence: {
            overall: 'low',
            rationale: [
              'Category mapping is candidate-grade and requires human review before production use.',
              'Disclosure-limited values reduce confidence for planning interpretation.'
            ]
          },
          cbpFacts: [{
            sourceRow: {
              ap_nf: 'D',
              emp_nf: 'D'
            },
            naics: '236118',
            naicsTitle: 'Residential Remodelers',
            establishments: 2,
            annualPayroll: 0,
            employment: 0,
            notes: 'Payroll and employment values are disclosure-limited in this row and should be interpreted as constrained context.'
          }],
          limitations: [
            'This fixture is descriptive planning context only and is not a site recommendation.'
          ],
          sourceProvenance: {
            sourceCount: 1,
            sources: [{
              sourceId: 'datospr-cbp-2014-municipios',
              publisher: 'U.S. Census Bureau',
              portal: 'Datos.PR',
              license: 'Creative Commons Attribution',
              retrievedAt: '2026-05-24',
              targetTables: [
                'cbps',
                'muns'
              ],
              legacySchemaCoverage: {
                cnaic: 'exact',
                county: 'exact',
                total_indus: 'derived'
              }
            }]
          },
          unresolvedQuestions: [
            'Should the planning-context municipality registry expand to every Puerto Rico fipscty code before additional fixtures are added?'
          ],
          guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
          }
        }]
      },
      mun003_restaurant: {
        meta: {
          total: 1,
          count: 1,
          offset: 0,
          error: null
        },
        data: [{
          id: 'mun003_restaurant',
          municipality: {
            code: '003',
            label: 'Aguada'
          },
          businessCategory: {
            id: 'restaurant-cafe',
            displayName: 'Restaurant or cafe'
          },
          confidence: {
            overall: 'medium',
            rationale: [
              'Category mapping is candidate-grade and requires human review before production use.',
              'Rounded noise-flagged values should remain descriptive.'
            ]
          },
          cbpFacts: [{
            sourceRow: {
              ap_nf: 'H',
              emp_nf: 'H'
            },
            naics: '722511',
            naicsTitle: 'Full-Service Restaurants',
            establishments: 18,
            annualPayroll: 667,
            employment: 85,
            notes: 'Fact row matches municipality and NAICS exactly, but noise flags indicate rounded values and should remain descriptive context.'
          }],
          limitations: [
            'A single row does not support demand, viability, profitability, or permit conclusions.'
          ],
          sourceProvenance: {
            sourceCount: 1,
            sources: [{
              sourceId: 'datospr-cbp-2014-municipios',
              publisher: 'U.S. Census Bureau',
              portal: 'Datos.PR',
              license: 'Creative Commons Attribution',
              retrievedAt: '2026-05-24',
              targetTables: [
                'cbps',
                'muns'
              ],
              legacySchemaCoverage: {
                cnaic: 'exact',
                county: 'exact',
                total_indus: 'derived'
              }
            }]
          },
          unresolvedQuestions: [
            'Should the NAICS title registry expand to every mapped business-category code before additional fixtures are added?'
          ],
          guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
          }
        }]
      }
    };

    const body = detailPayloads[detailId];

    if (!body) {
      route.fulfill({
        body: JSON.stringify({
          meta: {
            total: 0,
            count: 0,
            offset: 0,
            error: 'Not Found'
          },
          data: []
        }),
        contentType: 'application/json',
        status: 404
      });
      return;
    }

    route.fulfill({
      body: JSON.stringify(body),
      contentType: 'application/json',
      status: 200
    });
  });

  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  page.on('request', request => {
    requestedPaths.push(new URL(request.url()).pathname);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  assert.strictEqual(await page.title(), 'Utoplan.me - Modular data visualizer for strategic planning.');
  assert.strictEqual(await page.locator('[data-map="main"]').count(), 1, 'map container should render');
  assert.strictEqual(await page.locator('[data-ui="layer-menu"] li').count(), 10, 'layer menu should render expected entries');
  assert.strictEqual(await page.locator('[data-ui="planning-context-list"] li').count(), 2, 'planning-context options should render');
  assert(
    (await page.locator('[data-ui="planning-context-status"]').innerText()).indexOf('Descriptive planning-context options') !== -1,
    'planning-context status should describe guardrails'
  );
  await page.waitForFunction(() => {
    const detail = document.querySelector('[data-ui="planning-context-detail"]');
    return !!detail && detail.textContent.indexOf('Confidence rationale') !== -1;
  }, {}, { timeout: 3000 });
  assert(
    (await page.locator('[data-ui="planning-context-detail-status"]').innerText()).indexOf('Descriptive detail only') !== -1,
    'planning-context detail status should describe guardrails'
  );
  const planningDetailText = (await page.locator('[data-ui="planning-context-detail"]').innerText()).toLowerCase();
  assert(
    planningDetailText.indexOf('confidence rationale') !== -1,
    'planning-context detail should render rationale section'
  );
  assert(
    planningDetailText.indexOf('annual payroll: masked (disclosure-limited)') !== -1,
    'planning-context detail should mask disclosure-limited payroll values'
  );
  assert(
    planningDetailText.indexOf('cbp fact: residential remodelers (236118)') !== -1,
    'planning-context detail should render source-backed NAICS title labels'
  );
  assert(
    planningDetailText.indexOf('source provenance') !== -1 &&
    planningDetailText.indexOf('u.s. census bureau via datos.pr') !== -1,
    'planning-context detail should render source provenance'
  );
  assert.strictEqual(await page.locator('.leaflet-tile-pane img.leaflet-tile').count() > 0, true, 'base map tiles should render');
  assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 4, 'partial university markers should render');
  assert(
    (await page.locator('[data-ui="unis-coverage-status"]').innerText()).indexOf('Partial reviewed Census-cache coverage') !== -1,
    'university layer should render partial coverage status'
  );
  assert(requestedPaths.includes('/v1/unis'), 'map should try the modern API endpoint first');
  assert(requestedPaths.includes('/v1/planning-context'), 'page should load planning-context summaries from the modern API path');
  assert(requestedPaths.includes('/v1/planning-context/mun001_construction'), 'page should load planning-context detail for the selected summary');
  assert(!requestedPaths.includes('/data/unis.json'), 'map should not fetch fixture data when the modern API responds');
  await assertVisible(page, '#layersMenu', 'layer menu should be visible');
  await waitForDisplay(page, '[data-ui="sidebar"]', 'none');
  await assertHidden(page, '[data-ui="sidebar"]', 'sidebar should start hidden');

  await page.locator('[data-ui="layer-menu-toggle"]').click();
  await waitForDisplay(page, '[data-ui="layer-menu"]', 'none');
  assert.strictEqual(await page.locator('[data-ui="layer-menu-toggle"]').getAttribute('aria-expanded'), 'false');
  await assertHidden(page, '[data-ui="layer-menu"]', 'layer list should hide after dropdown click');
  await page.locator('[data-ui="layer-menu-toggle"]').click();
  await waitForDisplay(page, '[data-ui="layer-menu"]', 'block');
  assert.strictEqual(await page.locator('[data-ui="layer-menu-toggle"]').getAttribute('aria-expanded'), 'true');
  assert.strictEqual(await getDisplay(page, '[data-ui="layer-menu"]'), 'block', 'layer list should show after second dropdown click');

  await page.locator('[data-ui="layer-filter"]').fill('software');
  assert.strictEqual(await page.locator('[data-ui="layer-menu"] li:not([hidden])').count(), 1, 'layer filter should narrow the layer list');
  assert(
    (await page.locator('[data-ui="layer-menu"] li:not([hidden])').innerText()).indexOf('Software') !== -1,
    'layer filter should keep matching layer text visible'
  );
  await page.locator('[data-ui="layer-filter"]').fill('');
  assert.strictEqual(await page.locator('[data-ui="layer-menu"] li:not([hidden])').count(), 10, 'clearing layer filter should restore all layers');

  await page.locator('[data-ui="sidebar-toggle"]').click();
  await waitForDisplay(page, '[data-ui="sidebar"]', 'block');
  assert.strictEqual(await page.locator('[data-ui="sidebar-toggle"]').getAttribute('aria-expanded'), 'true');
  assert.strictEqual(await getDisplay(page, '[data-ui="sidebar"]'), 'block', 'sidebar should show after toggle click');
  await page.locator('[data-ui="sidebar-toggle"]').click();
  await waitForDisplay(page, '[data-ui="sidebar"]', 'none');
  assert.strictEqual(await page.locator('[data-ui="sidebar-toggle"]').getAttribute('aria-expanded'), 'false');
  await assertHidden(page, '[data-ui="sidebar"]', 'sidebar should hide after second toggle click');

  await page.locator('[data-ui="layer-visibility"].eyeClosed').first().click();
  assert(
    await page.locator('[data-ui="layer-visibility"].eyeOpened').count() >= 2,
    'layer eye click should open an additional layer icon'
  );

  await page.locator('[data-planning-context-id="mun003_restaurant"]').click();
  await page.waitForFunction(() => {
    const detail = document.querySelector('[data-ui="planning-context-detail"]');
    return !!detail && detail.textContent.indexOf('approx. 667') !== -1;
  }, {}, { timeout: 3000 });
  assert(requestedPaths.includes('/v1/planning-context/mun003_restaurant'), 'page should request detail for a newly selected summary');
  assert(
    (await page.locator('[data-ui="planning-context-detail"]').innerText()).toLowerCase().indexOf('employment: approx. 85') !== -1,
    'planning-context detail should mark rounded values as approximate'
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
