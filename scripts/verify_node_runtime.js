'use strict';

var fs = require('fs');
var path = require('path');

function parseMajor(value) {
  var match = String(value || '').trim().match(/^v?([0-9]+)/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function readPinnedMajor(rootDir) {
  var versionFile = path.join(rootDir, '.node-version');
  var content = fs.readFileSync(versionFile, 'utf8');
  var major = parseMajor(content);

  if (!Number.isInteger(major) || major < 1) {
    throw new Error('.node-version must start with a valid Node major version');
  }

  return major;
}

function validateVersion(currentVersion, expectedMajor) {
  var currentMajor = parseMajor(currentVersion);

  if (!Number.isInteger(currentMajor)) {
    return 'Unable to determine the active Node.js version.';
  }

  if (currentMajor !== expectedMajor) {
    return 'Node ' + expectedMajor + '.x is required for local install, build, and test workflows; found ' +
      currentVersion + '. Use the pinned version from .nvmrc/.node-version.';
  }

  return null;
}

function run(options) {
  var settings = options || {};
  var rootDir = settings.rootDir || path.join(__dirname, '..');
  var currentVersion = settings.currentVersion || process.version;
  var expectedMajor = settings.expectedMajor || readPinnedMajor(rootDir);
  var error = validateVersion(currentVersion, expectedMajor);

  if (error) {
    console.error(error);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run());
}

module.exports = {
  parseMajor: parseMajor,
  readPinnedMajor: readPinnedMajor,
  run: run,
  validateVersion: validateVersion
};
