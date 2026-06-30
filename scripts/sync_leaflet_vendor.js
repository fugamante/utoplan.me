'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var rootDir = path.join(__dirname, '..');
var vendorDir = path.join(rootDir, 'app', 'public', 'vendor', 'leaflet');
var metadataPath = path.join(vendorDir, 'VENDOR.json');
var metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function download(url) {
  var response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to download ' + url + ': HTTP ' + response.status);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function syncFile(file) {
  var sourceUrl = metadata.distributionBaseUrl + '/' + (file.sourcePath || file.path);
  var targetPath = path.join(vendorDir, file.path);
  var buffer = await download(sourceUrl);
  var digest = sha256(buffer);

  if (digest !== file.sha256) {
    throw new Error('Checksum mismatch for ' + file.path + ': expected ' + file.sha256 + ' but received ' + digest);
  }

  fs.mkdirSync(path.dirname(targetPath), {recursive: true});
  fs.writeFileSync(targetPath, buffer);
  process.stderr.write('synced ' + file.path + '\n');
}

async function main() {
  for (var i = 0; i < metadata.files.length; i++) {
    await syncFile(metadata.files[i]);
  }
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
