var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  var vendorDir = path.join(__dirname, '..', 'public', 'vendor', 'leaflet');
  var metadataPath = path.join(vendorDir, 'VENDOR.json');
  var metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  var leafletJs = fs.readFileSync(path.join(vendorDir, 'leaflet.js'), 'utf8');
  var versionPattern = new RegExp('Leaflet ' + metadata.version.replace(/\./g, '\\.'));
  var exportPattern = new RegExp('t\\.version=\"' + metadata.version.replace(/\./g, '\\.') + '\"');

  assert.strictEqual(metadata.library, 'leaflet');
  assert.strictEqual(metadata.source, 'https://leafletjs.com/download.html');
  assert.strictEqual(
    metadata.distributionBaseUrl,
    'https://unpkg.com/leaflet@' + metadata.version + '/dist'
  );
  assert(Array.isArray(metadata.files), 'metadata files should be an array');
  assert(metadata.files.length >= 5, 'metadata should enumerate the vendored files');
  assert(versionPattern.test(leafletJs), 'leaflet.js should expose the pinned Leaflet header version');
  assert(exportPattern.test(leafletJs), 'leaflet.js should export the pinned Leaflet runtime version');

  metadata.files.forEach(function(file) {
    var filePath = path.join(vendorDir, file.path);
    var fileDigest = sha256(fs.readFileSync(filePath));

    assert(fs.existsSync(filePath), file.path + ' should exist');
    assert.strictEqual(fileDigest, file.sha256, file.path + ' should match the pinned checksum');
  });
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
