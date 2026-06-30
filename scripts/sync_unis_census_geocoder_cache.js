#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var SOURCE_ID = 'datospr-higher-ed-directory-2017-18';
var PROVIDER = 'U.S. Census Geocoding Services API';
var BENCHMARK = 'Public_AR_Census2020';
var VINTAGE = 'Census2020_Census2020';
var ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
var REVIEWER = 'Modernization Maintainer';

var REVIEW_PATH = path.join(__dirname, '..', 'data', 'unis', 'ipeds-alias-campus-review.json');
var ADDRESS_REVIEW_PATH = path.join(__dirname, '..', 'data', 'geocoding', 'unis-public-address-review.json');
var CACHE_PATH = path.join(__dirname, '..', 'data', 'geocoding', 'unis-census-geocoder-cache.json');
var QUARANTINE_PATH = path.join(__dirname, '..', 'data', 'geocoding', 'unis-import-quarantine.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAddress(record) {
  return [
    record.directoryAddress,
    record.directoryMunicipality,
    'Puerto Rico'
  ].filter(function(part) {
    return String(part || '').trim() !== '';
  }).join(', ');
}

function getReviewedAddress(record, reviewByInstitution) {
  var review = reviewByInstitution[record.directoryInstitution];

  if (!review || review.status !== 'reviewed' || !review.useForGeocoder) {
    return normalizeAddress(record);
  }

  if (String(review.reviewedAddress || '').trim() === '') {
    throw new Error('missing reviewedAddress for ' + record.directoryInstitution);
  }

  return String(review.reviewedAddress).trim();
}

function fetchGeocode(address) {
  var url = new URL(ENDPOINT);

  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', BENCHMARK);
  url.searchParams.set('vintage', VINTAGE);
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

function getCounty(match) {
  var counties = match &&
    match.geographies &&
    Array.isArray(match.geographies.Counties) &&
    match.geographies.Counties;

  if (!counties || counties.length === 0) {
    return null;
  }

  return counties[0];
}

function buildCacheRecord(record, address, match, state, reviewDate) {
  var county = getCounty(match);

  return {
    sourceId: SOURCE_ID,
    directoryInstitution: record.directoryInstitution,
    directoryMunicipality: record.directoryMunicipality,
    directoryAddress: record.directoryAddress,
    decisionType: record.decisionType,
    auxiliaryInstitution: record.auxiliaryInstitution,
    auxiliaryUnitid: record.auxiliaryUnitid,
    normalizedAddress: address,
    provider: PROVIDER,
    servicePath: 'geographies/onelineaddress',
    benchmark: BENCHMARK,
    vintage: VINTAGE,
    matchedAddress: match.matchedAddress,
    latitude: match.coordinates.y,
    longitude: match.coordinates.x,
    puertoRicoStateGEOID: state.GEOID,
    puertoRicoStateName: state.NAME,
    countyGEOID: county ? county.GEOID : null,
    countyName: county ? county.NAME : null,
    reviewStatus: 'reviewed',
    reviewedAt: reviewDate,
    reviewer: REVIEWER
  };
}

function buildQuarantineRecord(record, address, reason, reviewDate) {
  return {
    sourceId: SOURCE_ID,
    directoryInstitution: record.directoryInstitution,
    directoryMunicipality: record.directoryMunicipality,
    normalizedAddress: address,
    exclusionReason: reason,
    reviewStatus: 'reviewed',
    reviewedAt: reviewDate
  };
}

function compareByInstitution(left, right) {
  return String(left.directoryInstitution || '').localeCompare(String(right.directoryInstitution || ''));
}

function main() {
  var reviewDate = today();
  var review = readJson(REVIEW_PATH);
  var addressReview = readJson(ADDRESS_REVIEW_PATH);
  var existingQuarantine = readJson(QUARANTINE_PATH);
  var cacheRecords = [];
  var geocodeQuarantine = [];
  var approvedNames;
  var preservedQuarantine;
  var addressReviewByInstitution = Object.create(null);

  if (review.sourceId !== SOURCE_ID) {
    throw new Error('unexpected match review sourceId ' + review.sourceId);
  }

  if (addressReview.sourceId !== SOURCE_ID) {
    throw new Error('unexpected address review sourceId ' + addressReview.sourceId);
  }

  addressReview.records.forEach(function(record) {
    if (addressReviewByInstitution[record.directoryInstitution]) {
      throw new Error('duplicate address review row ' + record.directoryInstitution);
    }

    addressReviewByInstitution[record.directoryInstitution] = record;
  });

  approvedNames = Object.create(null);
  review.approvedMatches.forEach(function(record) {
    approvedNames[record.directoryInstitution] = true;
  });
  preservedQuarantine = existingQuarantine.records.filter(function(record) {
    return !approvedNames[record.directoryInstitution];
  });

  review.approvedMatches.forEach(function(record) {
    var address = getReviewedAddress(record, addressReviewByInstitution);
    var response = fetchGeocode(address);
    var matches = response && response.result && Array.isArray(response.result.addressMatches)
      ? response.result.addressMatches
      : [];
    var accepted = matches.find(function(match) {
      return match.coordinates &&
        typeof match.coordinates.x === 'number' &&
        typeof match.coordinates.y === 'number' &&
        getPuertoRicoState(match);
    });
    var state = getPuertoRicoState(accepted);

    if (accepted && state) {
      cacheRecords.push(buildCacheRecord(record, address, accepted, state, reviewDate));
      return;
    }

    geocodeQuarantine.push(buildQuarantineRecord(
      record,
      address,
      'No reviewed Puerto Rico Census geocoder match was returned for this approved alias/campus row; keep it excluded from production-style unis import until address evidence changes.',
      reviewDate
    ));
  });

  cacheRecords.sort(compareByInstitution);
  geocodeQuarantine.sort(compareByInstitution);

  writeJson(CACHE_PATH, {
    schemaVersion: 1,
    provider: PROVIDER,
    benchmark: BENCHMARK,
    vintage: VINTAGE,
    generatedAt: reviewDate,
    sourceId: SOURCE_ID,
    buildCommand: 'node scripts/sync_unis_census_geocoder_cache.js',
    policyDocPath: 'docs/unis-geocoding-policy.md',
    matchReviewArtifactPath: 'data/unis/ipeds-alias-campus-review.json',
    addressReviewArtifactPath: 'data/geocoding/unis-public-address-review.json',
    summary: {
      approvedMatchCount: review.approvedMatches.length,
      reviewedCacheRecordCount: cacheRecords.length,
      geocoderQuarantineCount: geocodeQuarantine.length
    },
    records: cacheRecords
  });

  writeJson(QUARANTINE_PATH, {
    schemaVersion: existingQuarantine.schemaVersion,
    sourceId: SOURCE_ID,
    policy: existingQuarantine.policy,
    generatedAt: reviewDate,
    status: existingQuarantine.status,
    addressReviewArtifactPath: 'data/geocoding/unis-public-address-review.json',
    records: preservedQuarantine.concat(geocodeQuarantine).sort(compareByInstitution)
  });

  process.stdout.write(
    'wrote ' + cacheRecords.length + ' reviewed cache records and ' +
    geocodeQuarantine.length + ' geocoder quarantine records\n'
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exit(1);
}
