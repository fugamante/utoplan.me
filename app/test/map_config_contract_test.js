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
    dataUrl: '/data/unis.json',
    tileAttribution: '&copy; OpenStreetMap contributors',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  });

  assert.deepStrictEqual(mapConfig.readMapConfig({}), mapConfig.DEFAULT_MAP_CONFIG);
  assert.deepStrictEqual(mapConfig.readMapConfig({
    UTOPLAN_API_URL: '/api/unis.json',
    UTOPLAN_TILE_ATTRIBUTION: 'Tiles',
    UTOPLAN_TILE_URL: ''
  }), {
    center: [18.4110494, -66.0985525],
    zoom: 8,
    dataUrl: '/api/unis.json',
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
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
