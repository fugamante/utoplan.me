var assert = require('assert');
var fs = require('fs');
var path = require('path');

async function importBrowserModule(filePath) {
  var source = fs.readFileSync(filePath, 'utf8');
  var encoded = Buffer.from(source).toString('base64');

  return import('data:text/javascript;base64,' + encoded);
}

async function main() {
  var mapConfig = await importBrowserModule(path.join(__dirname, '../public/js/map_config.js'));

  assert.deepStrictEqual(mapConfig.DEFAULT_MAP_CONFIG, {
    center: [18.4110494, -66.0985525],
    zoom: 8,
    dataUrl: '/v1/unis',
    fallbackDataUrl: '/data/unis.json',
    tileAttribution: '&copy; OpenStreetMap contributors',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  });

  assert.deepStrictEqual(mapConfig.readMapConfig({}), mapConfig.DEFAULT_MAP_CONFIG);
  assert.deepStrictEqual(mapConfig.readMapConfig({
    UTOPLAN_API_URL: '/api/unis.json',
    UTOPLAN_FALLBACK_DATA_URL: '/offline/unis.json',
    UTOPLAN_TILE_ATTRIBUTION: 'Tiles',
    UTOPLAN_TILE_URL: ''
  }), {
    center: [18.4110494, -66.0985525],
    zoom: 8,
    dataUrl: '/api/unis.json',
    fallbackDataUrl: '/offline/unis.json',
    tileAttribution: 'Tiles',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  });

  assert.deepStrictEqual(mapConfig.normalizeUniversity({
    title: 'Contract University',
    lat: '18.42',
    long: '-66.06',
    ignored: true
  }), {
    title: 'Contract University',
    position: [18.42, -66.06]
  });

  assert.deepStrictEqual(mapConfig.normalizeUniversities({
    data: [
      {title: 'A', lat: 1, long: 2},
      {title: 'B', lat: '3', long: '4'}
    ]
  }), [
    {title: 'A', position: [1, 2]},
    {title: 'B', position: [3, 4]}
  ]);

  assert.deepStrictEqual(mapConfig.normalizeUniversities({}), []);

  assert.deepStrictEqual(mapConfig.normalizeUniversityCoverage({
    meta: {
      coverage: {
        status: 'partial',
        coverageLabel: 'Partial reviewed Census-cache coverage: 4 included rows, 42 reviewed exclusions.',
        reviewedCacheRows: 4,
        excludedRows: 42,
        limitations: [
          'The /v1/unis collection is not complete Puerto Rico higher-education coverage.'
        ]
      }
    }
  }), {
    status: 'partial',
    label: 'Partial reviewed Census-cache coverage: 4 included rows, 42 reviewed exclusions.',
    reviewedCacheRows: 4,
    excludedRows: 42,
    limitation: 'The /v1/unis collection is not complete Puerto Rico higher-education coverage.'
  });

  assert.strictEqual(mapConfig.normalizeUniversityCoverage({}), null);
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
