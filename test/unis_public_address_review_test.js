'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var reviewPath = path.join(__dirname, '..', 'data', 'geocoding', 'unis-public-address-review.json');
var verificationPath = path.join(__dirname, '..', 'data', 'geocoding', 'unis-address-verification.json');
var cachePath = path.join(__dirname, '..', 'data', 'geocoding', 'unis-census-geocoder-cache.json');
var quarantinePath = path.join(__dirname, '..', 'data', 'geocoding', 'unis-import-quarantine.json');

var review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
var verification = JSON.parse(fs.readFileSync(verificationPath, 'utf8'));
var cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
var quarantine = JSON.parse(fs.readFileSync(quarantinePath, 'utf8'));

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

assert.strictEqual(review.schemaVersion, 1, 'schemaVersion must be 1');
assert.strictEqual(review.sourceId, 'datospr-higher-ed-directory-2017-18', 'unexpected sourceId');
assert.strictEqual(review.status, 'reviewed', 'review status must be reviewed');
assert(isIsoDate(review.reviewedAt), 'reviewedAt must be ISO YYYY-MM-DD');
assert.strictEqual(review.benchmark, cache.benchmark, 'benchmark must stay pinned to the cache benchmark');
assert.strictEqual(review.vintage, cache.vintage, 'vintage must stay pinned to the cache vintage');
assert(Array.isArray(review.records), 'records must be an array');
assert.strictEqual(review.records.length, 16, 'review must cover the 16 approved geocoder-quarantined rows from this pass');
assert.strictEqual(review.summary.reviewedRowCount, review.records.length, 'reviewedRowCount must match records length');
assert.strictEqual(review.summary.activeRowsReviewedCount, 13, 'expected 13 active rows in the current reviewed board');
assert.strictEqual(review.summary.inactiveOrUnverifiedRowsReviewedCount, 3, 'expected 3 inactive or unverified rows in the current reviewed board');
assert.strictEqual(verification.schemaVersion, 1, 'verification schemaVersion must be 1');
assert.strictEqual(verification.sourceId, review.sourceId, 'verification sourceId must match review');
assert.strictEqual(verification.addressReviewArtifactPath, 'data/geocoding/unis-public-address-review.json');
assert.strictEqual(verification.benchmark, review.benchmark, 'verification benchmark must match review');
assert.strictEqual(verification.vintage, review.vintage, 'verification vintage must match review');
assert.strictEqual(verification.decision, 'retain-remaining-geocoder-quarantine');
assert.strictEqual(verification.summary.reviewedNonPromotedRows, 15, 'verification must cover 15 non-promoted rows');
assert.strictEqual(verification.summary.geocoderAttemptRows, 13, 'verification must rerun 13 reviewed address candidates');
assert.strictEqual(verification.summary.notRerunRows, 2, 'verification must preserve 2 not-rerun rows');
assert.strictEqual(verification.summary.promotionEligibleRows, 0, 'verification must not expose promotion-eligible rows');

var promoted = review.records.filter(function(record) {
  return record.decision === 'promote-reviewed-cache';
});
assert.strictEqual(promoted.length, 1, 'exactly one row should be promoted in this reviewed pass');
assert.strictEqual(promoted[0].directoryInstitution, 'Escuela de Medicina San Juan Bautista', 'unexpected promoted row');

review.records.forEach(function(record) {
  assert(typeof record.rowCandidate === 'string' && record.rowCandidate.trim() !== '', 'rowCandidate is required for ' + record.directoryInstitution);
  assert(typeof record.currentNormalizedAddress === 'string' && record.currentNormalizedAddress.trim() !== '', 'currentNormalizedAddress is required for ' + record.directoryInstitution);
  assert(Object.prototype.hasOwnProperty.call(record, 'currentReviewedAddress'), 'currentReviewedAddress is required for ' + record.directoryInstitution);
  assert(typeof record.newOfficialEvidenceFound === 'string' && record.newOfficialEvidenceFound.trim() !== '', 'newOfficialEvidenceFound is required for ' + record.directoryInstitution);
  assert(typeof record.activeLocationStatus === 'string' && record.activeLocationStatus.trim() !== '', 'activeLocationStatus is required for ' + record.directoryInstitution);
  assert(Array.isArray(record.publicEvidenceFound), 'publicEvidenceFound must be an array for ' + record.directoryInstitution);
  assert(record.censusResult && typeof record.censusResult === 'object', 'censusResult is required for ' + record.directoryInstitution);
  assert(typeof record.decision === 'string' && record.decision.trim() !== '', 'decision is required for ' + record.directoryInstitution);

  if (record.useForGeocoder) {
    assert(typeof record.reviewedAddress === 'string' && record.reviewedAddress.trim() !== '', 'reviewedAddress is required when useForGeocoder is true for ' + record.directoryInstitution);
    assert(typeof record.candidateAddressTested === 'string' && record.candidateAddressTested.trim() !== '', 'candidateAddressTested is required when useForGeocoder is true for ' + record.directoryInstitution);
  } else {
    assert.strictEqual(record.reviewedAddress, null, 'reviewedAddress must be null when useForGeocoder is false for ' + record.directoryInstitution);
    assert.strictEqual(record.candidateAddressTested, null, 'candidateAddressTested must be null when useForGeocoder is false for ' + record.directoryInstitution);
  }
});

assert(cache.records.some(function(record) {
  return record.directoryInstitution === 'Escuela de Medicina San Juan Bautista' &&
    record.normalizedAddress === promoted[0].reviewedAddress;
}), 'promoted row must exist in the reviewed cache with the reviewed address');

assert(quarantine.records.some(function(record) {
  return record.directoryInstitution === 'University of Phoenix';
}), 'University of Phoenix must remain quarantined');

assert(review.records.some(function(record) {
  return record.directoryInstitution === 'Columbia Central University' &&
    record.activeLocationStatus === 'inactive-stale-additional-location';
}), 'Columbia Central University must remain marked as an inactive stale additional location');

var verificationByInstitution = verification.records.reduce(function(index, record) {
  index[record.directoryInstitution] = record;
  return index;
}, {});

assert.strictEqual(verification.records.length, 15, 'verification must include only the 15 non-promoted rows');
verification.records.forEach(function(record) {
  assert.strictEqual(record.promotionEligible, false, 'verification row must not be promotion eligible: ' + record.directoryInstitution);
  assert(typeof record.promotionBlocker === 'string' && record.promotionBlocker.trim() !== '', 'verification row must include promotionBlocker: ' + record.directoryInstitution);
  assert(quarantine.records.some(function(quarantineRecord) {
    return quarantineRecord.directoryInstitution === record.directoryInstitution;
  }), 'verification row must remain quarantined: ' + record.directoryInstitution);
});

assert.strictEqual(verificationByInstitution['Columbia Central University'].puertoRicoMatch, true, 'Columbia must record the non-promoted Puerto Rico match');
assert.strictEqual(
  verificationByInstitution['Columbia Central University'].promotionBlocker,
  'matched-address-conflicts-with-reviewed-public-address',
  'Columbia must stay blocked by reviewed-address conflict'
);
