'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var artifactPath = path.join(__dirname, '..', 'data', 'naics', 'cbp-naics-titles.json');
var planningRegistryPath = path.join(__dirname, '..', 'data', 'naics', 'planning-context-naics-titles.json');

var artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
var planningRegistry = JSON.parse(fs.readFileSync(planningRegistryPath, 'utf8'));

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

var entriesByCode = Object.create(null);
var previousCode = '';

assert.strictEqual(artifact.schemaVersion, 1, 'schemaVersion must be 1');
assert.strictEqual(artifact.scope, 'puerto-rico-cbp-naics-titles', 'scope mismatch');
assert(isIsoDate(artifact.retrievedAt), 'retrievedAt must be an ISO YYYY-MM-DD date');
assert.strictEqual(artifact.buildCommand, 'node scripts/sync_naics_registry.js', 'buildCommand mismatch');
assert(Array.isArray(artifact.sourceIds), 'sourceIds must be an array');
assert.strictEqual(artifact.sourceIds.length, 3, 'sourceIds must list the registered CBP sources');
assert(artifact.sourceUrls && typeof artifact.sourceUrls === 'object', 'sourceUrls are required');
assert(Array.isArray(artifact.entries), 'entries must be an array');
assert.strictEqual(artifact.codeCount, artifact.entries.length, 'codeCount must match entries length');
assert.strictEqual(artifact.entries.length, 1772, 'artifact must cover the registered Puerto Rico CBP code set');

artifact.entries.forEach(function(entry) {
  assert(typeof entry === 'object' && entry, 'entry must be an object');
  assert(typeof entry.code === 'string' && /^[0-9/-]{6}$/.test(entry.code), 'entry code must preserve six-character CBP NAICS text');
  assert(typeof entry.title === 'string' && entry.title.trim() !== '', 'entry title is required for ' + entry.code);
  assert(previousCode < entry.code, 'entries must be sorted by code');
  assert(!entriesByCode[entry.code], 'duplicate entry for ' + entry.code);
  entriesByCode[entry.code] = entry.title;
  previousCode = entry.code;
});

assert.strictEqual(entriesByCode['------'], 'Total for all sectors');
assert.strictEqual(entriesByCode['23----'], 'Construction');
assert.strictEqual(entriesByCode['31----'], 'Manufacturing');
assert.strictEqual(entriesByCode['44----'], 'Retail Trade');
assert.strictEqual(entriesByCode['48----'], 'Transportation and Warehousing');
assert.strictEqual(entriesByCode['99----'], 'Industries not classified');
assert.strictEqual(entriesByCode['236118'], 'Residential Remodelers');
assert.strictEqual(entriesByCode['722511'], 'Full-Service Restaurants');

planningRegistry.entries.forEach(function(entry) {
  assert.strictEqual(entriesByCode[entry.code], entry.title, 'planning-context title must align with import registry for ' + entry.code);
});
