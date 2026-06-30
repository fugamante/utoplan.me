'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var review = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'identity-review.json'), 'utf8'));
var matchReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'ipeds-alias-campus-review.json'), 'utf8'));
var quarantine = JSON.parse(fs.readFileSync(path.join(root, 'data', 'geocoding', 'unis-import-quarantine.json'), 'utf8'));
var generated = JSON.parse(fs.readFileSync(path.join(root, 'data', 'generated', 'unis-partial-import.json'), 'utf8'));
var orlieReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'orlie-jip-row-review.json'), 'utf8'));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIdentityQuarantine(record) {
  return record.exclusionReason.indexOf('No reviewed auxiliary IPEDS alias/campus match') !== -1 ||
    record.exclusionReason.indexOf('No exact source-backed institution identity match') !== -1;
}

var identityQuarantineByInstitution = quarantine.records.reduce(function(index, record) {
  if (isIdentityQuarantine(record)) {
    index[record.directoryInstitution] = record;
  }
  return index;
}, {});
var generatedNames = generated.rows.reduce(function(index, record) {
  index[record.title] = true;
  return index;
}, {});
var reviewByInstitution = review.records.reduce(function(index, record) {
  index[record.directoryInstitution] = record;
  return index;
}, {});

assert.strictEqual(review.schemaVersion, 1);
assert.strictEqual(review.sourceId, 'datospr-higher-ed-directory-2017-18');
assert(isIsoDate(review.generatedAt), 'generatedAt must be ISO YYYY-MM-DD');
assert.strictEqual(review.buildCommand, 'node scripts/verify_unis_identity.js');
assert.strictEqual(review.status, 'reviewed-excluded');
assert.strictEqual(review.decision, 'retain-identity-quarantine');
assert.strictEqual(review.productBoundary, 'descriptive-only');
assert.strictEqual(review.matchReviewArtifactPath, 'data/unis/ipeds-alias-campus-review.json');
assert.strictEqual(review.quarantineArtifactPath, 'data/geocoding/unis-import-quarantine.json');
assert.strictEqual(review.generatedArtifactPath, 'data/generated/unis-partial-import.json');
assert(Array.isArray(review.authoritySources), 'authoritySources must be an array');
assert.strictEqual(review.summary.identityQuarantinedRows, 27);
assert.strictEqual(review.summary.authorityReviewedRows, 5);
assert.strictEqual(review.summary.identityCorroboratedRows, 5);
assert.strictEqual(review.summary.dapipReviewedRows, 5);
assert.strictEqual(review.summary.orlieReviewedRows, 5);
assert.strictEqual(review.summary.identityPromotedRows, 0);
assert.strictEqual(review.summary.directImportEligibleRows, 0);
assert.strictEqual(review.summary.coordinateEligibleRows, 0);
assert.strictEqual(review.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(review.summary.rowsMissingExactAliasCampusEvidence, 27);
assert.strictEqual(review.summary.rowsWithoutRowLevelAuthorityCorroboration, 22);
assert.strictEqual(review.summary.rowsStillMissingOrlieJipCorroboration, 22);
assert.strictEqual(review.records.length, 27);
assert.strictEqual(matchReview.quarantinedRows.length, review.records.length);
assert.strictEqual(orlieReview.schemaVersion, 1);
assert.strictEqual(orlieReview.sourceId, 'prdos-orlie-jip-postsecondary-listing');
assert.strictEqual(orlieReview.status, 'row-level-query-reviewed');
assert.strictEqual(orlieReview.productBoundary, 'descriptive-only');
assert.strictEqual(orlieReview.summary.reviewedRows, 5);
assert.strictEqual(orlieReview.summary.matchedRows, 5);
assert.strictEqual(orlieReview.summary.importEligibleRows, 0);
assert.strictEqual(orlieReview.summary.coordinateEligibleRows, 0);
assert.strictEqual(orlieReview.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(orlieReview.sourceContract.resourceKey, '2393e952-ae43-401c-9c03-fbae9ff20b5f');
assert.strictEqual(orlieReview.sourceContract.tableEntity, 'Instituciones');
assert(orlieReview.sourceContract.queryEndpoint.indexOf('/public/reports/querydata') !== -1, 'ORLIE/JIP query endpoint must be recorded');
assert(orlieReview.sourceContract.excludedFields.indexOf('E-Mail') !== -1, 'ORLIE/JIP artifact must exclude personal contact fields');
assert(Array.isArray(review.authoritySourceReviewNotes), 'authoritySourceReviewNotes must be an array');
assert(review.authoritySourceReviewNotes.some(function(note) {
  return note.sourceId === 'usdoe-dapip-puerto-rico' &&
    note.status === 'row-level-corroboration-recorded-for-nces-subset' &&
    note.reviewedRows === 5;
}), 'DAPIP source review note must record the five-row subset');
assert(review.authoritySourceReviewNotes.some(function(note) {
  return note.sourceId === 'prdos-orlie-jip-postsecondary-listing' &&
    note.status === 'row-level-corroboration-recorded-for-nces-dapip-subset' &&
    note.reviewedRows === 5 &&
    note.reviewArtifactPath === 'data/unis/orlie-jip-row-review.json';
}), 'ORLIE/JIP source review note must record the bounded five-row subset');

matchReview.quarantinedRows.forEach(function(record) {
  assert(reviewByInstitution[record.directoryInstitution], 'identity review missing quarantined row: ' + record.directoryInstitution);
});

review.records.forEach(function(record) {
  assert(isNonEmptyString(record.directoryInstitution), 'directoryInstitution is required');
  assert(isNonEmptyString(record.directoryMunicipality), 'directoryMunicipality is required');
  assert(isNonEmptyString(record.directoryAddress), 'directoryAddress is required');
  assert(isNonEmptyString(record.normalizedAddress), 'normalizedAddress is required');
  assert(isNonEmptyString(record.matchReviewReason), 'matchReviewReason is required');
  assert(isNonEmptyString(record.quarantineExclusionReason), 'quarantineExclusionReason is required');
  assert(isNonEmptyString(record.classification), 'classification is required');
  assert(isNonEmptyString(record.identityStatus), 'identityStatus is required');
  assert(isNonEmptyString(record.corroborationStatus), 'corroborationStatus is required');
  assert.strictEqual(record.importEligible, false);
  assert.strictEqual(record.coordinateEligible, false);
  assert.strictEqual(record.generatedOutputEligible, false);
  assert(Array.isArray(record.authorityEvidenceReviewed), 'authorityEvidenceReviewed must be an array');
  assert(Array.isArray(record.requiredAuthoritySources), 'requiredAuthoritySources must be an array');
  assert(Array.isArray(record.remainingAuthoritySources), 'remainingAuthoritySources must be an array');
  assert(record.requiredAuthoritySources.indexOf('nces-college-navigator-puerto-rico') !== -1, 'NCES source must be required');
  assert(record.requiredAuthoritySources.indexOf('usdoe-dapip-puerto-rico') !== -1, 'DAPIP source must be required');
  assert(record.requiredAuthoritySources.indexOf('prdos-orlie-jip-postsecondary-listing') !== -1, 'ORLIE/JIP source must be required');
  assert(Array.isArray(record.requiredPromotionEvidence), 'requiredPromotionEvidence must be an array');
  assert(record.requiredPromotionEvidence.indexOf('reviewed Puerto Rico Census geocoder cache match') !== -1, 'Census cache evidence must remain required');
  assert(isNonEmptyString(record.directImportBlocker), 'directImportBlocker is required');
  assert(identityQuarantineByInstitution[record.directoryInstitution], 'identity row must remain in quarantine: ' + record.directoryInstitution);
  assert(!generatedNames[record.directoryInstitution], 'identity row must not appear in generated output: ' + record.directoryInstitution);
});

[
  'Universidad Ana G. Méndez',
  'Universidad Carlos Albizu',
  'Universidad de Puerto Rico',
  'Universidad del Sagrado Corazón',
  'Universidad Interamericana de PR'
].forEach(function(name) {
  var record = reviewByInstitution[name];
  assert(record, 'expected NCES-reviewed row: ' + name);
  assert(record.classification.indexOf('nces-') === 0, 'classification must record NCES corroboration: ' + name);
  assert(record.classification.indexOf('dapip') !== -1, 'classification must record DAPIP corroboration: ' + name);
  assert(record.classification.indexOf('orlie') !== -1, 'classification must record ORLIE/JIP corroboration: ' + name);
  assert.strictEqual(record.identityStatus, 'identity-corroborated-not-import-ready', 'identity status must remain non-import-ready: ' + name);
  assert.strictEqual(record.corroborationStatus, 'nces-dapip-orlie-row-reviewed', 'corroborationStatus must record NCES, DAPIP, and ORLIE/JIP review: ' + name);
  assert.strictEqual(record.authorityEvidenceReviewed.length, 3, 'NCES, DAPIP, and ORLIE/JIP evidence items expected: ' + name);
  assert.strictEqual(record.authorityEvidenceReviewed[0].sourceId, 'nces-college-navigator-puerto-rico', 'NCES source expected: ' + name);
  assert(record.authorityEvidenceReviewed[0].sourceUrl.indexOf('https://nces.ed.gov/collegenavigator/?id=') === 0, 'NCES College Navigator URL expected: ' + name);
  assert(record.authorityEvidenceReviewed.some(function(evidence) {
    return evidence.sourceId === 'usdoe-dapip-puerto-rico' &&
      evidence.sourceUrl.indexOf('https://ope.ed.gov/dapip/#/institution-profile/') === 0 &&
      evidence.apiInstitutionUrl.indexOf('https://ope.ed.gov/dapip/api/institutions/') === 0 &&
      evidence.apiAccreditationUrl.indexOf('https://ope.ed.gov/dapip/api/records/institutional/profile/') === 0 &&
      evidence.activeStatus === 'Active' &&
      evidence.accreditationStatus === 'Active';
  }), 'DAPIP evidence item expected: ' + name);
  assert(record.authorityEvidenceReviewed.some(function(evidence) {
    return evidence.sourceId === 'prdos-orlie-jip-postsecondary-listing' &&
      evidence.reviewArtifactPath === 'data/unis/orlie-jip-row-review.json' &&
      evidence.sourceUrl === 'https://www.estado.pr.gov/instituciones-educativas' &&
      evidence.reportUrl.indexOf('https://app.powerbigov.us/view?r=') === 0 &&
      isNonEmptyString(evidence.matchedName) &&
      isNonEmptyString(evidence.licenseExpiration) &&
      evidence.evidenceRole === 'licensure-listing-corroboration';
  }), 'ORLIE/JIP evidence item expected: ' + name);
  assert.strictEqual(record.remainingAuthoritySources.indexOf('usdoe-dapip-puerto-rico'), -1, 'DAPIP must no longer remain unresolved: ' + name);
  assert.strictEqual(record.remainingAuthoritySources.indexOf('prdos-orlie-jip-postsecondary-listing'), -1, 'ORLIE/JIP must no longer remain unresolved for reviewed row: ' + name);
  assert.strictEqual(record.importEligible, false, 'ORLIE/JIP corroboration must not create import eligibility: ' + name);
  assert.strictEqual(record.coordinateEligible, false, 'ORLIE/JIP corroboration must not create coordinate eligibility: ' + name);
  assert.strictEqual(record.generatedOutputEligible, false, 'ORLIE/JIP corroboration must not create generated output eligibility: ' + name);
});

review.records.filter(function(record) {
  return record.authorityEvidenceReviewed.length === 0;
}).forEach(function(record) {
  assert.strictEqual(record.classification, 'identity-authority-review-required', 'unreviewed rows must retain authority-review-required classification: ' + record.directoryInstitution);
  assert.strictEqual(record.identityStatus, 'not-import-ready', 'unreviewed rows must remain not import-ready: ' + record.directoryInstitution);
  assert.strictEqual(record.corroborationStatus, 'not-row-reviewed', 'unreviewed rows must stay not-row-reviewed: ' + record.directoryInstitution);
});
