'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var smoke = require('../scripts/data_source_smoke');

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-source-smoke-test-'));
var outPath = path.join(tmpDir, 'skipped.json');
var skippedResult;
var registry = {
  sources: [
    {
      id: 'datospr-cbp-2014-municipios',
      resourceUrl: 'https://example.test/cbp.csv',
      sourceUrl: 'https://example.test/cbp',
      publisher: 'Fixture Publisher',
      license: 'Fixture License',
      scope: 'puerto-rico'
    },
    {
      id: 'datospr-official-municipality-boundaries',
      resourceUrl: 'https://example.test/municipios.csv',
      sourceUrl: 'https://example.test/municipios',
      publisher: 'Fixture Publisher',
      license: 'Fixture License',
      scope: 'puerto-rico'
    }
  ]
};
var cacheDir = path.join(tmpDir, 'cache');
var cbpCsv = 'fipscty,cencty,naics,emp,ap,est,NAICS2012_TTL\n001,001,541,10,20,2,Professional Services\n';
var munsCsv = 'municipio,countyfp,cntyidfp,statefp\n' + Array.apply(null, {
  length: 78
}).map(function(_, index) {
  var county = String((index * 2) + 1);
  var padded = new Array(4 - county.length).join('0') + county;
  return 'Municipio ' + (index + 1) + ',' + padded + ',72' + padded + ',72';
}).join('\n') + '\n';

assert.deepStrictEqual(smoke.sourceIdsFromArgs([]), smoke.DEFAULT_SOURCE_IDS);
assert.deepStrictEqual(smoke.sourceIdsFromArgs([
  '--sources=datospr-cbp-2014-municipios, datospr-official-municipality-boundaries'
]), [
  'datospr-cbp-2014-municipios',
  'datospr-official-municipality-boundaries'
]);
assert.throws(function() {
  smoke.selectSources(registry, ['missing']);
}, /Unknown source id missing/);

skippedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_source_smoke.js',
  '--out=' + outPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(skippedResult.status, 0);
assert.strictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')).status, 'skipped');

smoke.runSmoke({
  registry: registry,
  cacheDir: cacheDir,
  sourceIds: [
    'datospr-cbp-2014-municipios',
    'datospr-official-municipality-boundaries'
  ],
  now: '2026-05-25T12:00:00.000Z',
  fetch: function(url) {
    if (url === 'https://example.test/cbp.csv') {
      return Promise.resolve(cbpCsv);
    }
    if (url === 'https://example.test/municipios.csv') {
      return Promise.resolve(munsCsv);
    }
    return Promise.reject(new Error('unexpected URL ' + url));
  }
}).then(function(result) {
  assert.strictEqual(result.status, 'pass');
  assert.strictEqual(result.plan.tables.cbps.accepted, 1);
  assert.strictEqual(result.plan.tables.muns.accepted, 78);
  assert(result.assertions.some(function(assertion) {
    return assertion.name === 'muns accepted rows' && assertion.ok === true;
  }));

  fs.rmSync(tmpDir, {
    recursive: true,
    force: true
  });
}).catch(function(error) {
  fs.rmSync(tmpDir, {
    recursive: true,
    force: true
  });
  throw error;
});
