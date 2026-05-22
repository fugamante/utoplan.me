'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var registryPath = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasPuertoRicoScope(source) {
  if (source.scope === 'puerto-rico') {
    return true;
  }

  return source.scope === 'puerto-rico-filtered' && source.scopeFilter === 'state:72';
}

assert.strictEqual(registry.schemaVersion, 1);
assert.strictEqual(registry.scope, 'puerto-rico-only');
assert(isNonEmptyString(registry.retrievedAt));
assert(Array.isArray(registry.sources));
assert(registry.sources.length > 0);

registry.sources.forEach(function(source) {
  assert(isNonEmptyString(source.id), 'source id is required');
  assert(isNonEmptyString(source.status), source.id + ' status is required');
  assert(Array.isArray(source.targetTables), source.id + ' targetTables must be an array');
  assert(source.targetTables.length > 0, source.id + ' must target at least one legacy table');
  assert(isNonEmptyString(source.publisher), source.id + ' publisher is required');
  assert(isNonEmptyString(source.portal), source.id + ' portal is required');
  assert(isNonEmptyString(source.license), source.id + ' license is required');
  assert(isNonEmptyString(source.sourceUrl), source.id + ' sourceUrl is required');
  assert(isNonEmptyString(source.resourceUrl) || isNonEmptyString(source.apiUrl), source.id + ' must include a resourceUrl or apiUrl');
  assert(isNonEmptyString(source.sourceBasis), source.id + ' sourceBasis is required');
  assert(hasPuertoRicoScope(source), source.id + ' must be Puerto Rico-only or filtered with state:72');
});

assert(Array.isArray(registry.unresolvedTargets));
registry.unresolvedTargets.forEach(function(target) {
  assert.strictEqual(target.status, 'blocked');
  assert(Array.isArray(target.targetTables));
  assert(target.targetTables.length > 0);
  assert(isNonEmptyString(target.reason));
});
