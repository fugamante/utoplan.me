#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var SOURCE_ID = 'datospr-higher-ed-directory-2017-18';
var ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
var REVIEW_PATH = path.join(__dirname, '..', 'data', 'geocoding', 'unis-public-address-review.json');
var OUTPUT_PATH = path.join(__dirname, '..', 'data', 'geocoding', 'unis-address-verification.json');
var REVIEWER = 'Modernization Maintainer';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fetchGeocode(address, benchmark, vintage) {
  var url = new URL(ENDPOINT);

  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', benchmark);
  url.searchParams.set('vintage', vintage);
  url.searchParams.set('format', 'json');

  return JSON.parse(childProcess.execFileSync('curl', [
    '-L',
    '--silent',
    '--show-error',
    '--fail',
    '--max-time',
    '30',
    url.toString()
  ], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  }));
}

function getPuertoRicoState(match) {
  var states = match &&
    match.geographies &&
    Array.isArray(match.geographies.States) &&
    match.geographies.States;

  if (!states) {
    return null;
  }

  return states.find(function(state) {
    return state.STATE === '72' || state.STUSAB === 'PR' || state.NAME === 'Puerto Rico';
  }) || null;
}

function verificationAddress(record) {
  return record.candidateAddressTested || record.reviewedAddress || record.currentReviewedAddress;
}

function buildNotRerun(record) {
  return {
    directoryInstitution: record.directoryInstitution,
    attemptedAddress: null,
    reviewedAddress: record.reviewedAddress,
    useForGeocoder: false,
    activeLocationStatus: record.activeLocationStatus,
    censusStatus: record.censusResult.status,
    matchCount: 0,
    puertoRicoMatch: false,
    matchedAddress: null,
    latitude: null,
    longitude: null,
    promotionEligible: false,
    promotionBlocker: record.decision
  };
}

function buildVerification(record, benchmark, vintage) {
  var address = verificationAddress(record);
  var response = fetchGeocode(address, benchmark, vintage);
  var matches = response && response.result && Array.isArray(response.result.addressMatches)
    ? response.result.addressMatches
    : [];
  var accepted = matches.find(function(match) {
    return match.coordinates &&
      typeof match.coordinates.x === 'number' &&
      typeof match.coordinates.y === 'number' &&
      getPuertoRicoState(match);
  });
  var hasPuertoRicoMatch = Boolean(accepted);
  var ambiguousMatch = hasPuertoRicoMatch &&
    String(record.censusResult && record.censusResult.notes || '').indexOf('ambiguous') !== -1;

  return {
    directoryInstitution: record.directoryInstitution,
    attemptedAddress: address,
    reviewedAddress: record.reviewedAddress,
    useForGeocoder: true,
    activeLocationStatus: record.activeLocationStatus,
    censusStatus: hasPuertoRicoMatch ? 'puerto-rico-match-not-promoted' : 'no-reviewed-pr-match',
    matchCount: matches.length,
    puertoRicoMatch: hasPuertoRicoMatch,
    matchedAddress: accepted ? accepted.matchedAddress : null,
    latitude: accepted ? accepted.coordinates.y : null,
    longitude: accepted ? accepted.coordinates.x : null,
    promotionEligible: false,
    promotionBlocker: ambiguousMatch
      ? 'matched-address-conflicts-with-reviewed-public-address'
      : hasPuertoRicoMatch
      ? 'requires-reviewed-address-artifact-promotion-decision'
      : 'no-reviewed-puerto-rico-census-match'
  };
}

function compareByInstitution(left, right) {
  return String(left.directoryInstitution || '').localeCompare(String(right.directoryInstitution || ''));
}

function main() {
  var review = readJson(REVIEW_PATH);
  var reviewDate = today();
  var records;

  if (review.sourceId !== SOURCE_ID) {
    throw new Error('unexpected address review sourceId ' + review.sourceId);
  }

  records = review.records
    .filter(function(record) {
      return record.decision !== 'promote-reviewed-cache';
    })
    .map(function(record) {
      if (!record.useForGeocoder) {
        return buildNotRerun(record);
      }

      return buildVerification(record, review.benchmark, review.vintage);
    })
    .sort(compareByInstitution);

  writeJson(OUTPUT_PATH, {
    schemaVersion: 1,
    sourceId: SOURCE_ID,
    generatedAt: reviewDate,
    reviewer: REVIEWER,
    buildCommand: 'node scripts/verify_unis_addresses.js',
    addressReviewArtifactPath: 'data/geocoding/unis-public-address-review.json',
    cacheArtifactPath: 'data/geocoding/unis-census-geocoder-cache.json',
    quarantineArtifactPath: 'data/geocoding/unis-import-quarantine.json',
    benchmark: review.benchmark,
    vintage: review.vintage,
    decision: 'retain-remaining-geocoder-quarantine',
    decisionSummary: 'The remaining approved geocoder-quarantined rows do not have a clean reviewed Census-cache promotion candidate. Puerto Rico matches for non-promoted rows still require an explicit address-review promotion decision before cache inclusion.',
    summary: {
      reviewedNonPromotedRows: records.length,
      geocoderAttemptRows: records.filter(function(record) {
        return record.useForGeocoder;
      }).length,
      notRerunRows: records.filter(function(record) {
        return !record.useForGeocoder;
      }).length,
      puertoRicoMatchNotPromotedRows: records.filter(function(record) {
        return record.puertoRicoMatch;
      }).length,
      promotionEligibleRows: records.filter(function(record) {
        return record.promotionEligible;
      }).length
    },
    records: records
  });

  process.stdout.write('wrote unis address verification to ' + OUTPUT_PATH + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exit(1);
}
