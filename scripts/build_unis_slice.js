'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var cachePath = path.join(root, 'data', 'geocoding', 'unis-census-geocoder-cache.json');
var quarantinePath = path.join(root, 'data', 'geocoding', 'unis-import-quarantine.json');
var boundaryPath = path.join(root, 'data', 'geocoding', 'unis-import-boundary-review.json');
var sourceFieldsPath = path.join(root, 'data', 'unis', 'partial-source-fields.json');
var jsonOutputPath = path.join(root, 'data', 'generated', 'unis-partial-import.json');
var sqlOutputPath = path.join(root, 'docker', 'postgres', '002_unis_partial_seed.sql');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return "'" + String(value).replace(/'/g, "''") + "'";
}

function timestampLiteral(value) {
  return "TIMESTAMP " + sqlString(value + ' 00:00:00');
}

function sourceKey(record) {
  return [
    record.directoryInstitution,
    record.directoryMunicipality,
    record.directoryAddress
  ].join('|');
}

function sourceIndex(sourceFields) {
  return sourceFields.records.reduce(function(index, record) {
    index[sourceKey(record)] = record;
    return index;
  }, {});
}

function buildDesc(sourceRecord) {
  var fields = [];

  if (sourceRecord.academicUnit) {
    fields.push('Academic unit: ' + sourceRecord.academicUnit);
  }

  return fields.length ? fields.join('; ') : null;
}

function buildRows(cache, sourceFields) {
  var sourceByKey = sourceIndex(sourceFields);

  return cache.records.map(function(record, index) {
    var sourceRecord = sourceByKey[sourceKey(record)];

    assert(sourceRecord, 'partial unis source fields missing cache row: ' + record.directoryInstitution);

    return {
      id: index + 1,
      title: record.directoryInstitution,
      address: record.normalizedAddress,
      desc: buildDesc(sourceRecord),
      lat: record.latitude,
      long: record.longitude,
      created_at: cache.generatedAt,
      updated_at: cache.generatedAt,
      provenance: {
        sourceId: record.sourceId,
        directoryInstitution: record.directoryInstitution,
        directoryMunicipality: record.directoryMunicipality,
        directoryAddress: record.directoryAddress,
        auxiliaryInstitution: record.auxiliaryInstitution,
        auxiliaryUnitid: record.auxiliaryUnitid,
        normalizedAddress: record.normalizedAddress,
        matchedAddress: record.matchedAddress,
        provider: record.provider,
        benchmark: record.benchmark,
        vintage: record.vintage,
        countyGEOID: record.countyGEOID,
        countyName: record.countyName,
        reviewStatus: record.reviewStatus,
        reviewedAt: record.reviewedAt,
        reviewer: record.reviewer
      },
      sourceFields: {
        artifactPath: 'data/unis/partial-source-fields.json',
        academicUnit: sourceRecord.academicUnit
      }
    };
  });
}

function validate(cache, quarantine, boundary, sourceFields, rows) {
  var boundaryCounts = boundary.currentCounts || {};
  var accepted = boundary.acceptedBoundary || {};
  var quarantinedNames = Object.create(null);
  var sourceByKey = sourceIndex(sourceFields);

  assert(boundary.status === 'accepted', 'unis boundary must be accepted before generating a partial import slice');
  assert(boundary.decision === 'accept-partial-import', 'unis boundary decision must be accept-partial-import');
  assert(accepted.coverage === 'partial', 'accepted unis boundary coverage must be partial');
  assert(accepted.includedRows === cache.records.length, 'accepted includedRows must match cache record count');
  assert(accepted.excludedRows === quarantine.records.length, 'accepted excludedRows must match quarantine record count');
  assert(accepted.sourceFieldsArtifactPath === 'data/unis/partial-source-fields.json', 'accepted boundary sourceFieldsArtifactPath mismatch');
  assert(boundaryCounts.reviewedCensusCacheRows === cache.records.length, 'boundary reviewed cache count must match cache records');
  assert(
    boundaryCounts.geocoderQuarantinedApprovedRows + boundaryCounts.identityQuarantinedRows === quarantine.records.length,
    'boundary quarantine counts must match quarantine records'
  );
  assert(sourceFields.schemaVersion === 1, 'partial unis source fields schemaVersion must be 1');
  assert(sourceFields.sourceId === boundary.sourceId, 'partial unis source fields sourceId must match boundary');
  assert(sourceFields.includedRows === cache.records.length, 'partial unis source fields includedRows must match cache records');
  assert(sourceFields.records.length === cache.records.length, 'partial unis source fields must cover every cache row');

  quarantine.records.forEach(function(record) {
    quarantinedNames[record.directoryInstitution] = true;
  });

  cache.records.forEach(function(record) {
    var sourceRecord = sourceByKey[sourceKey(record)];

    assert(sourceRecord, 'partial unis source fields missing cache row: ' + record.directoryInstitution);
    assert(!Object.prototype.hasOwnProperty.call(sourceRecord, 'principalExecutive'), 'partial unis source fields must not store principal-executive personal names: ' + record.directoryInstitution);
    assert(!quarantinedNames[sourceRecord.directoryInstitution], 'partial unis source fields must exclude quarantined row: ' + sourceRecord.directoryInstitution);
  });

  rows.forEach(function(row) {
    assert(row.id > 0, 'generated row id is required');
    assert(row.title && typeof row.title === 'string', 'generated row title is required');
    assert(row.address && typeof row.address === 'string', 'generated row address is required');
    assert(row.desc === null || typeof row.desc === 'string', 'generated row desc must be null or source-backed text');
    assert(typeof row.lat === 'number' && Number.isFinite(row.lat), 'generated row latitude is required');
    assert(typeof row.long === 'number' && Number.isFinite(row.long), 'generated row longitude is required');
    assert(!quarantinedNames[row.title], 'quarantined row must not be generated: ' + row.title);
    assert(row.provenance.reviewStatus === 'reviewed', 'generated row must come from reviewed cache evidence: ' + row.title);
  });
}

function writeJson(cache, boundary, rows) {
  var output = {
    schemaVersion: 1,
    generatedAt: cache.generatedAt,
    buildCommand: 'node scripts/build_unis_slice.js',
    sourceId: boundary.sourceId,
    status: 'partial',
    productBoundary: boundary.productBoundary,
    coverageLabel: boundary.acceptedBoundary.coverageLabel,
    includedRows: rows.length,
    excludedRows: boundary.acceptedBoundary.excludedRows,
    cacheArtifactPath: boundary.evidenceArtifacts.cacheArtifactPath,
    quarantineArtifactPath: boundary.evidenceArtifacts.quarantineArtifactPath,
    importBoundaryArtifactPath: 'data/geocoding/unis-import-boundary-review.json',
    sourceFieldsArtifactPath: 'data/unis/partial-source-fields.json',
    limitations: [
      boundary.acceptedBoundary.apiCoverageLanguage,
      boundary.acceptedBoundary.exclusionLanguage
    ],
    rows: rows
  };

  fs.writeFileSync(jsonOutputPath, JSON.stringify(output, null, 2) + '\n');
}

function writeSql(rows) {
  var lines = [
    '-- Generated by node scripts/build_unis_slice.js. Do not edit by hand.',
    '-- Seeds only the accepted partial unis boundary from data/generated/unis-partial-import.json.',
    'INSERT INTO unis (id, title, address, "desc", lat, long, created_at, updated_at)',
    'VALUES'
  ];

  rows.forEach(function(row, index) {
    var suffix = index === rows.length - 1 ? ';' : ',';

    lines.push('  (' + [
      row.id,
      sqlString(row.title),
      sqlString(row.address),
      sqlString(row.desc),
      row.lat,
      row.long,
      timestampLiteral(row.created_at),
      timestampLiteral(row.updated_at)
    ].join(', ') + ')' + suffix);
  });

  lines.push('');
  lines.push("SELECT setval('unis_id_seq', " + rows.length + ', true);');
  lines.push('');

  fs.writeFileSync(sqlOutputPath, lines.join('\n'));
}

function main() {
  var cache = readJson(cachePath);
  var quarantine = readJson(quarantinePath);
  var boundary = readJson(boundaryPath);
  var sourceFields = readJson(sourceFieldsPath);
  var rows = buildRows(cache, sourceFields);

  validate(cache, quarantine, boundary, sourceFields, rows);
  writeJson(cache, boundary, rows);
  writeSql(rows);

  process.stderr.write('Generated ' + rows.length + ' partial unis rows\n');
}

main();
