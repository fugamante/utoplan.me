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
var followupReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'corroborated-identity-followup-review.json'), 'utf8'));
var albizuStagedReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'albizu-staged-review.json'), 'utf8'));
var sagradoStagedReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'unis', 'sagrado-staged-review.json'), 'utf8'));
var publicAddressReview = JSON.parse(fs.readFileSync(path.join(root, 'data', 'geocoding', 'unis-public-address-review.json'), 'utf8'));

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
var orlieByInstitution = orlieReview.records.reduce(function(index, record) {
  index[record.directoryInstitution] = record;
  return index;
}, {});
var publicAddressByInstitution = publicAddressReview.records.reduce(function(index, record) {
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
assert.strictEqual(followupReview.schemaVersion, 1);
assert.strictEqual(followupReview.sourceId, 'datospr-higher-ed-directory-2017-18');
assert.strictEqual(followupReview.status, 'reviewed-no-promotion');
assert.strictEqual(followupReview.decision, 'retain-identity-quarantine-for-corroborated-subset');
assert.strictEqual(followupReview.productBoundary, 'descriptive-only');
assert.strictEqual(followupReview.inputArtifacts.identityReviewArtifactPath, 'data/unis/identity-review.json');
assert.strictEqual(followupReview.inputArtifacts.orlieJipReviewArtifactPath, 'data/unis/orlie-jip-row-review.json');
assert.strictEqual(followupReview.inputArtifacts.aliasCampusReviewArtifactPath, 'data/unis/ipeds-alias-campus-review.json');
assert.strictEqual(followupReview.inputArtifacts.publicAddressReviewArtifactPath, 'data/geocoding/unis-public-address-review.json');
assert.strictEqual(followupReview.inputArtifacts.albizuStagedReviewArtifactPath, 'data/unis/albizu-staged-review.json');
assert.strictEqual(followupReview.inputArtifacts.sagradoStagedReviewArtifactPath, 'data/unis/sagrado-staged-review.json');
assert.strictEqual(followupReview.inputArtifacts.addressVerificationArtifactPath, 'data/geocoding/unis-address-verification.json');
assert.strictEqual(followupReview.inputArtifacts.importBoundaryArtifactPath, 'data/geocoding/unis-import-boundary-review.json');
assert.strictEqual(followupReview.inputArtifacts.quarantineArtifactPath, 'data/geocoding/unis-import-quarantine.json');
assert.strictEqual(followupReview.inputArtifacts.generatedArtifactPath, 'data/generated/unis-partial-import.json');
assert.strictEqual(followupReview.summary.reviewedRows, 5);
assert.strictEqual(followupReview.summary.identityCorroboratedRows, 5);
assert.strictEqual(followupReview.summary.acceptedAliasCampusRows, 2);
assert.strictEqual(followupReview.summary.reviewedPublicAddressRows, 2);
assert.strictEqual(followupReview.summary.censusCacheEligibleRows, 0);
assert.strictEqual(followupReview.summary.importEligibleRows, 0);
assert.strictEqual(followupReview.summary.coordinateEligibleRows, 0);
assert.strictEqual(followupReview.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(followupReview.records.length, 5);
assert(followupReview.invariants.some(function(invariant) {
  return invariant.indexOf('ORLIE/JIP licensure-listing evidence remains corroboration context only') !== -1;
}), 'follow-up review must keep ORLIE/JIP evidence corroboration-only');
assert.strictEqual(albizuStagedReview.schemaVersion, 1);
assert.strictEqual(albizuStagedReview.sourceId, 'datospr-higher-ed-directory-2017-18');
assert(isIsoDate(albizuStagedReview.reviewedAt), 'Albizu staged review reviewedAt must be ISO YYYY-MM-DD');
assert.strictEqual(albizuStagedReview.status, 'staged-no-cache');
assert.strictEqual(albizuStagedReview.decision, 'accept-albizu-alias-public-address-stage');
assert.strictEqual(albizuStagedReview.productBoundary, 'descriptive-only');
assert.strictEqual(albizuStagedReview.inputArtifacts.identityFollowupReviewArtifactPath, 'data/unis/corroborated-identity-followup-review.json');
assert.strictEqual(albizuStagedReview.inputArtifacts.censusCacheArtifactPath, 'data/geocoding/unis-census-geocoder-cache.json');
assert.strictEqual(albizuStagedReview.summary.reviewedRows, 1);
assert.strictEqual(albizuStagedReview.summary.acceptedAliasCampusRows, 1);
assert.strictEqual(albizuStagedReview.summary.reviewedPublicAddressRows, 1);
assert.strictEqual(albizuStagedReview.summary.censusCacheEligibleRows, 0);
assert.strictEqual(albizuStagedReview.summary.importEligibleRows, 0);
assert.strictEqual(albizuStagedReview.summary.coordinateEligibleRows, 0);
assert.strictEqual(albizuStagedReview.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(albizuStagedReview.records.length, 1);
assert.strictEqual(albizuStagedReview.records[0].directoryInstitution, 'Universidad Carlos Albizu');
assert.strictEqual(albizuStagedReview.records[0].aliasCampusDecision, 'accepted-alias-evidence-staged');
assert.strictEqual(albizuStagedReview.records[0].publicAddressDecision, 'reviewed-public-address-evidence-staged');
assert.strictEqual(albizuStagedReview.records[0].censusCacheDecision, 'not-run-staged-before-cache-review');
assert.strictEqual(albizuStagedReview.records[0].useForGeocoder, false);
assert.strictEqual(albizuStagedReview.records[0].censusResult.attemptedAddress, null);
assert.strictEqual(albizuStagedReview.records[0].importEligible, false);
assert.strictEqual(albizuStagedReview.records[0].coordinateEligible, false);
assert.strictEqual(albizuStagedReview.records[0].generatedOutputEligible, false);
assert(albizuStagedReview.records[0].officialEvidence.some(function(evidence) {
  return evidence.sourceId === 'albizu-home' &&
    evidence.url === 'https://www.albizu.edu/?lang=es' &&
    evidence.evidenceRole === 'public-address-and-institution-identity';
}), 'Albizu staged review must cite official Albizu home address evidence');
assert(albizuStagedReview.records[0].officialEvidence.some(function(evidence) {
  return evidence.sourceId === 'albizu-san-juan' &&
    evidence.url === 'https://www.albizu.edu/san-juan/?lang=es' &&
    evidence.evidenceRole === 'public-address-and-campus-context';
}), 'Albizu staged review must cite official Albizu San Juan address evidence');
assert(albizuStagedReview.invariants.some(function(invariant) {
  return invariant.indexOf('does not authorize a Census geocoder attempt') !== -1;
}), 'Albizu staged review must block cache/geocoder overclaiming');
assert.strictEqual(sagradoStagedReview.schemaVersion, 1);
assert.strictEqual(sagradoStagedReview.sourceId, 'datospr-higher-ed-directory-2017-18');
assert(isIsoDate(sagradoStagedReview.reviewedAt), 'Sagrado staged review reviewedAt must be ISO YYYY-MM-DD');
assert.strictEqual(sagradoStagedReview.status, 'staged-no-cache');
assert.strictEqual(sagradoStagedReview.decision, 'accept-sagrado-alias-public-address-stage');
assert.strictEqual(sagradoStagedReview.productBoundary, 'descriptive-only');
assert.strictEqual(sagradoStagedReview.inputArtifacts.identityFollowupReviewArtifactPath, 'data/unis/corroborated-identity-followup-review.json');
assert.strictEqual(sagradoStagedReview.inputArtifacts.censusCacheArtifactPath, 'data/geocoding/unis-census-geocoder-cache.json');
assert.strictEqual(sagradoStagedReview.summary.reviewedRows, 1);
assert.strictEqual(sagradoStagedReview.summary.acceptedAliasCampusRows, 1);
assert.strictEqual(sagradoStagedReview.summary.reviewedPublicAddressRows, 1);
assert.strictEqual(sagradoStagedReview.summary.censusCacheEligibleRows, 0);
assert.strictEqual(sagradoStagedReview.summary.importEligibleRows, 0);
assert.strictEqual(sagradoStagedReview.summary.coordinateEligibleRows, 0);
assert.strictEqual(sagradoStagedReview.summary.generatedOutputEligibleRows, 0);
assert.strictEqual(sagradoStagedReview.records.length, 1);
assert.strictEqual(sagradoStagedReview.records[0].directoryInstitution, 'Universidad del Sagrado Corazón');
assert.strictEqual(sagradoStagedReview.records[0].aliasCampusDecision, 'accepted-alias-evidence-staged');
assert.strictEqual(sagradoStagedReview.records[0].publicAddressDecision, 'reviewed-public-address-evidence-staged');
assert.strictEqual(sagradoStagedReview.inputArtifacts.geocoderCandidateReviewArtifactPath, 'data/geocoding/sagrado-geocoder-candidate-review.json');
assert.strictEqual(sagradoStagedReview.records[0].geocoderCandidateReviewArtifactPath, 'data/geocoding/sagrado-geocoder-candidate-review.json');
assert.strictEqual(sagradoStagedReview.records[0].censusCacheDecision, 'read-only-candidate-review-no-cache-match');
assert.strictEqual(sagradoStagedReview.records[0].useForGeocoder, false);
assert.strictEqual(sagradoStagedReview.records[0].censusResult.attemptedAddress, null);
assert.strictEqual(sagradoStagedReview.records[0].importEligible, false);
assert.strictEqual(sagradoStagedReview.records[0].coordinateEligible, false);
assert.strictEqual(sagradoStagedReview.records[0].generatedOutputEligible, false);
assert(sagradoStagedReview.records[0].officialEvidence.some(function(evidence) {
  return evidence.sourceId === 'sagrado-contact' &&
    evidence.url === 'https://www.sagrado.edu/en/contact-us-2/' &&
    evidence.evidenceRole === 'public-address-and-institution-identity';
}), 'Sagrado staged review must cite official Sagrado public address evidence');
assert(sagradoStagedReview.records[0].officialEvidence.some(function(evidence) {
  return evidence.sourceId === 'msche-sagrado' &&
    evidence.url === 'https://www.msche.org/institution/0604/' &&
    evidence.evidenceRole === 'main-campus-and-accreditation-corroboration';
}), 'Sagrado staged review must cite MSCHE main-campus evidence');
assert(sagradoStagedReview.invariants.some(function(invariant) {
  return invariant.indexOf('does not authorize a Census geocoder attempt') !== -1;
}), 'Sagrado staged review must block cache/geocoder overclaiming');
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
  var followupRecord = followupReview.records.filter(function(candidate) {
    return candidate.directoryInstitution === name;
  })[0];
  assert(record, 'expected NCES-reviewed row: ' + name);
  assert(followupRecord, 'expected follow-up reviewed row: ' + name);
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
  assert.strictEqual(followupRecord.normalizedAddress, record.normalizedAddress, 'follow-up normalized address must come from identity review: ' + name);
  assert.strictEqual(followupRecord.identityClassification, record.classification, 'follow-up classification must mirror identity review: ' + name);
  assert.strictEqual(followupRecord.corroborationStatus, record.corroborationStatus, 'follow-up corroborationStatus must mirror identity review: ' + name);
  assert.strictEqual(followupRecord.orlieJipMatchType, orlieByInstitution[name].matchType, 'follow-up ORLIE/JIP matchType must mirror ORLIE review: ' + name);
  if (name === 'Universidad Carlos Albizu') {
    assert.strictEqual(followupRecord.aliasCampusDecision, 'accepted-alias-evidence-staged', 'Albizu follow-up must record staged alias evidence');
    assert.strictEqual(followupRecord.publicAddressDecision, 'reviewed-public-address-evidence-staged', 'Albizu follow-up must record staged public-address evidence');
    assert.strictEqual(followupRecord.albizuStagedReviewArtifactPath, 'data/unis/albizu-staged-review.json', 'Albizu follow-up must point to staged artifact');
    assert.strictEqual(followupRecord.censusCacheDecision, 'not-run-staged-before-cache-review', 'Albizu follow-up must not imply Census-cache eligibility');
    assert.strictEqual(followupRecord.promotionDecision, 'retain-quarantine-before-census-cache', 'Albizu follow-up must retain quarantine before cache review');
  } else if (name === 'Universidad del Sagrado Corazón') {
    assert.strictEqual(followupRecord.aliasCampusDecision, 'accepted-alias-evidence-staged', 'Sagrado follow-up must record staged alias evidence');
    assert.strictEqual(followupRecord.publicAddressDecision, 'reviewed-public-address-evidence-staged', 'Sagrado follow-up must record staged public-address evidence');
    assert.strictEqual(followupRecord.sagradoStagedReviewArtifactPath, 'data/unis/sagrado-staged-review.json', 'Sagrado follow-up must point to staged artifact');
    assert.strictEqual(followupRecord.censusCacheDecision, 'read-only-candidate-review-no-cache-match', 'Sagrado follow-up must not imply Census-cache eligibility');
    assert.strictEqual(followupRecord.promotionDecision, 'retain-quarantine-before-census-cache', 'Sagrado follow-up must retain quarantine before cache review');
  } else {
    assert.strictEqual(followupRecord.aliasCampusDecision, 'not-accepted', 'follow-up must keep alias/campus not accepted: ' + name);
    assert.strictEqual(followupRecord.publicAddressDecision, 'not-reviewed-for-identity-quarantined-row', 'follow-up must not imply public-address review coverage: ' + name);
    assert.strictEqual(followupRecord.censusCacheDecision, 'not-eligible-without-accepted-alias-campus-and-public-address-evidence', 'follow-up must not imply Census-cache eligibility: ' + name);
    assert.strictEqual(followupRecord.promotionDecision, 'retain-identity-quarantine', 'follow-up must retain identity quarantine: ' + name);
    assert(followupRecord.promotionBlockers.indexOf('missing accepted alias/campus decision') !== -1, 'follow-up must record alias/campus blocker: ' + name);
    assert(followupRecord.promotionBlockers.indexOf('missing reviewed public-address evidence') !== -1, 'follow-up must record public-address blocker: ' + name);
  }
  if (name === 'Universidad del Sagrado Corazón') {
    assert(followupRecord.promotionBlockers.indexOf('no reviewed Puerto Rico Census geocoder match for tested official-source address candidates') !== -1, 'Sagrado follow-up must record read-only Census candidate blocker');
  } else {
    assert(followupRecord.promotionBlockers.indexOf('missing reviewed Puerto Rico Census geocoder cache match') !== -1, 'follow-up must record Census-cache blocker: ' + name);
  }
  assert.strictEqual(followupRecord.importEligible, false, 'follow-up must not create import eligibility: ' + name);
  assert.strictEqual(followupRecord.coordinateEligible, false, 'follow-up must not create coordinate eligibility: ' + name);
  assert.strictEqual(followupRecord.generatedOutputEligible, false, 'follow-up must not create generated output eligibility: ' + name);
  assert.strictEqual(publicAddressByInstitution[name], undefined, 'identity follow-up row must not be misread as public-address-reviewed: ' + name);
  assert(!generatedNames[name], 'identity follow-up row must not appear in generated output: ' + name);
});

review.records.filter(function(record) {
  return record.authorityEvidenceReviewed.length === 0;
}).forEach(function(record) {
  assert.strictEqual(record.classification, 'identity-authority-review-required', 'unreviewed rows must retain authority-review-required classification: ' + record.directoryInstitution);
  assert.strictEqual(record.identityStatus, 'not-import-ready', 'unreviewed rows must remain not import-ready: ' + record.directoryInstitution);
  assert.strictEqual(record.corroborationStatus, 'not-row-reviewed', 'unreviewed rows must stay not-row-reviewed: ' + record.directoryInstitution);
});
