'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var cache = JSON.parse(fs.readFileSync(path.join(root, 'data', 'geocoding', 'unis-census-geocoder-cache.json'), 'utf8'));
var quarantine = JSON.parse(fs.readFileSync(path.join(root, 'data', 'geocoding', 'unis-import-quarantine.json'), 'utf8'));
var boundary = JSON.parse(fs.readFileSync(path.join(root, 'data', 'geocoding', 'unis-import-boundary-review.json'), 'utf8'));
var sourceFields = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'partial-source-fields.json'), 'utf8'));
var identityReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'identity-review.json'), 'utf8'));
var generated = JSON.parse(fs.readFileSync(path.join(root, 'data', 'generated', 'unis-partial-import.json'), 'utf8'));
var seedSql = fs.readFileSync(path.join(root, 'docker', 'postgres', '002_unis_partial_seed.sql'), 'utf8');

function sourceKey(record) {
  return [
    record.directoryInstitution,
    record.directoryMunicipality,
    record.directoryAddress
  ].join('|');
}

function buildDesc(record) {
  var fields = [];

  if (record.academicUnit) {
    fields.push('Academic unit: ' + record.academicUnit);
  }

  return fields.length > 0 ? fields.join('; ') : null;
}

function sqlValue(value) {
  if (value === null) {
    return 'NULL';
  }

  return "'" + value.replace(/'/g, "''") + "'";
}

var cacheNames = cache.records.map(function(record) {
  return record.directoryInstitution;
});
var sourceByKey = sourceFields.records.reduce(function(index, record) {
  index[sourceKey(record)] = record;
  return index;
}, {});
var quarantineNames = quarantine.records.reduce(function(index, record) {
  index[record.directoryInstitution] = true;
  return index;
}, {});

assert.strictEqual(generated.schemaVersion, 1);
assert.strictEqual(generated.buildCommand, 'node scripts/build_unis_slice.js');
assert.strictEqual(generated.sourceId, boundary.sourceId);
assert.strictEqual(generated.status, 'partial');
assert.strictEqual(generated.productBoundary, 'descriptive-only');
assert.strictEqual(generated.coverageLabel, boundary.acceptedBoundary.coverageLabel);
assert.strictEqual(generated.includedRows, boundary.acceptedBoundary.includedRows);
assert.strictEqual(generated.excludedRows, boundary.acceptedBoundary.excludedRows);
assert.strictEqual(generated.cacheArtifactPath, boundary.evidenceArtifacts.cacheArtifactPath);
assert.strictEqual(generated.quarantineArtifactPath, boundary.evidenceArtifacts.quarantineArtifactPath);
assert.strictEqual(generated.importBoundaryArtifactPath, 'data/geocoding/unis-import-boundary-review.json');
assert.strictEqual(generated.sourceFieldsArtifactPath, 'data/unis/partial-source-fields.json');
assert.strictEqual(boundary.evidenceArtifacts.identityReviewArtifactPath, 'data/unis/identity-review.json');
assert.strictEqual(identityReview.decision, 'retain-identity-quarantine');
assert.strictEqual(identityReview.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(sourceFields.sourceId, boundary.sourceId);
assert.strictEqual(sourceFields.includedRows, cache.records.length);
assert.strictEqual(sourceFields.records.length, cache.records.length);
assert.strictEqual(generated.rows.length, cache.records.length);
assert.deepStrictEqual(generated.rows.map(function(row) {
  return row.title;
}), cacheNames);

generated.rows.forEach(function(row, index) {
  var cacheRecord = cache.records[index];
  var sourceRecord = sourceByKey[sourceKey(cacheRecord)];

  assert(sourceRecord, 'source fields must include generated cache row: ' + row.title);
  var expectedDesc = buildDesc(sourceRecord);
  assert.strictEqual(row.id, index + 1);
  assert.strictEqual(row.title, cacheRecord.directoryInstitution);
  assert.strictEqual(row.address, cacheRecord.normalizedAddress);
  assert.strictEqual(row.desc, expectedDesc);
  assert.strictEqual(row.lat, cacheRecord.latitude);
  assert.strictEqual(row.long, cacheRecord.longitude);
  assert.strictEqual(row.created_at, cache.generatedAt);
  assert.strictEqual(row.updated_at, cache.generatedAt);
  assert.strictEqual(row.sourceFields.artifactPath, 'data/unis/partial-source-fields.json');
  assert.strictEqual(row.sourceFields.academicUnit, sourceRecord.academicUnit);
  assert(!Object.prototype.hasOwnProperty.call(sourceRecord, 'principalExecutive'), 'source fields must not store principal-executive personal names: ' + row.title);
  assert(!Object.prototype.hasOwnProperty.call(row.sourceFields, 'principalExecutive'), 'generated rows must not expose principal-executive personal names: ' + row.title);
  assert(row.desc === null || row.desc.indexOf('Principal executive:') === -1, 'generated desc must not expose principal-executive personal names: ' + row.title);
  assert.strictEqual(row.provenance.sourceId, cacheRecord.sourceId);
  assert.strictEqual(row.provenance.reviewStatus, 'reviewed');
  assert.strictEqual(row.provenance.matchedAddress, cacheRecord.matchedAddress);
  assert.strictEqual(row.provenance.benchmark, cacheRecord.benchmark);
  assert.strictEqual(row.provenance.vintage, cacheRecord.vintage);
  assert(!quarantineNames[row.title], 'generated partial import must exclude quarantined row: ' + row.title);
  assert(!quarantineNames[sourceRecord.directoryInstitution], 'source fields must exclude quarantined row: ' + sourceRecord.directoryInstitution);
  assert(seedSql.indexOf("'" + row.title.replace(/'/g, "''") + "'") !== -1, 'seed SQL must include generated row: ' + row.title);
  assert(seedSql.indexOf(sqlValue(row.desc)) !== -1, 'seed SQL must include generated desc for row: ' + row.title);
});

quarantine.records.forEach(function(record) {
  assert(seedSql.indexOf("'" + record.directoryInstitution.replace(/'/g, "''") + "'") === -1, 'seed SQL must exclude quarantined row: ' + record.directoryInstitution);
});

identityReview.records.forEach(function(record) {
  assert.strictEqual(record.generatedOutputEligible, false, 'identity review row must not be generated: ' + record.directoryInstitution);
  assert(seedSql.indexOf("'" + record.directoryInstitution.replace(/'/g, "''") + "'") === -1, 'seed SQL must exclude identity-quarantined row: ' + record.directoryInstitution);
});

assert(seedSql.indexOf('Contract University') === -1, 'seed SQL must not include placeholder unis data');
assert(seedSql.indexOf("SELECT setval('unis_id_seq', 4, true);") !== -1, 'seed SQL must advance unis sequence to generated row count');
