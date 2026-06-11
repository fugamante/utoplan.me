'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var auditPath = path.join(__dirname, '..', 'data', 'unis', 'ipeds-geocode-audit.json');
var audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

assert.strictEqual(audit.schemaVersion, 1, 'schemaVersion must be 1');
assert.strictEqual(audit.status, 'blocked', 'audit should remain blocked until full coordinate coverage is approved');
assert(isIsoDate(audit.reviewedAt), 'reviewedAt must be ISO YYYY-MM-DD');
assert.strictEqual(audit.buildCommand, 'node scripts/audit_unis_geocode_candidates.js', 'buildCommand mismatch');
assert.strictEqual(
  audit.matchRule,
  'normalized exact institution name + municipality only; no alias expansion, no fuzzy matching, no manual overrides',
  'matchRule mismatch'
);
assert(Array.isArray(audit.sources), 'sources must be an array');
assert.strictEqual(audit.sources.length, 2, 'sources must list the directory source and coordinate source');
assert(audit.summary && typeof audit.summary === 'object', 'summary is required');
assert.strictEqual(audit.summary.totalDirectoryInstitutions, 57, 'unexpected directory institution count');
assert.strictEqual(audit.summary.exactMatchCount, 11, 'unexpected exact-match count');
assert.strictEqual(audit.summary.unmatchedCount, 46, 'unexpected unmatched count');
assert.strictEqual(audit.summary.totalDirectoryInstitutions, audit.exactMatches.length + audit.unmatchedInstitutions.length, 'summary counts must match record arrays');
assert(Array.isArray(audit.exactMatches), 'exactMatches must be an array');
assert(Array.isArray(audit.unmatchedInstitutions), 'unmatchedInstitutions must be an array');
assert.strictEqual(audit.exactMatches[0].directoryInstitution, 'American University of Puerto Rico', 'expected first exact match');
assert.strictEqual(audit.exactMatches[0].latitude, '18.405857', 'expected exact-match latitude');
assert.strictEqual(audit.exactMatches[0].longitude, '-66.19127', 'expected exact-match longitude');
assert(audit.unmatchedInstitutions.some(function(entry) {
  return entry.directoryInstitution === 'Atlantic University College' && entry.candidateCount === 0;
}), 'expected Atlantic University College to remain unmatched');
assert.strictEqual(
  audit.nextDecision,
  'Record reviewed row-level alias and campus decisions in data/unis/ipeds-alias-campus-review.json under docs/unis-alias-campus-match-policy.md, or choose a different Puerto Rico coordinate source before marking unis import-ready.',
  'nextDecision mismatch'
);
