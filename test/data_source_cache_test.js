'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cache = require('../scripts/data_source_cache');

var source = {
  id: 'fixture-source',
  resourceUrl: 'https://example.test/source.csv',
  sourceUrl: 'https://example.test/dataset',
  publisher: 'Fixture Publisher',
  license: 'Fixture License',
  scope: 'puerto-rico'
};
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-data-cache-'));
var registryPath = path.join(tmpDir, 'registry.json');
var result;
var metadata;
var missingArgs;

assert.strictEqual(cache.sourceDownloadUrl(source), 'https://example.test/source.csv');
assert.strictEqual(cache.sourceExtension(source), '.csv');
assert.strictEqual(cache.validateSource(source), null);
assert(cache.validateSource({
  id: 'unsafe',
  resourceUrl: 'http://example.test/source.csv',
  scope: 'puerto-rico'
}).indexOf('must use an https source URL') !== -1);

cache.cacheSource(source, {
  cacheDir: tmpDir,
  now: '2026-05-22T00:00:00.000Z',
  fetch: function(url) {
    assert.strictEqual(url, source.resourceUrl);
    return Promise.resolve('a,b\n1,2\n');
  }
}).then(function(value) {
  result = value;
  assert.strictEqual(fs.readFileSync(result.dataPath, 'utf8'), 'a,b\n1,2\n');

  metadata = JSON.parse(fs.readFileSync(result.metadataPath, 'utf8'));
  assert.strictEqual(metadata.id, source.id);
  assert.strictEqual(metadata.url, source.resourceUrl);
  assert.strictEqual(metadata.retrievedAt, '2026-05-22T00:00:00.000Z');
  assert.strictEqual(metadata.bytes, 8);

  fs.writeFileSync(registryPath, JSON.stringify({
    sources: [source]
  }));

  assert.deepStrictEqual(cache.selectedSources(cache.readRegistry(registryPath), [
    '--source=fixture-source'
  ]), [source]);

  missingArgs = childProcess.spawnSync(process.execPath, [
    'scripts/data_source_cache.js',
    '--registry=' + registryPath
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });

  assert.strictEqual(missingArgs.status, 1);
  assert(missingArgs.stderr.indexOf('Missing required --source=<id> or --all argument') !== -1);

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
