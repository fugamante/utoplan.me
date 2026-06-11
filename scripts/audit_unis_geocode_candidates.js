#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var DIRECTORY_SOURCE = {
  id: 'datospr-higher-ed-directory-2017-18',
  url: 'https://datos.estadisticas.pr/dataset/ccf64cca-d0d6-4539-a803-70aeba73ea12/resource/818869e2-82c6-4189-bff8-40616e5d3010/download/directorio_de_instituciones_de_educaci_n_superior__puerto_rico__a_o_acad_mico_2017-18.csv'
};

var COORDINATE_SOURCE = {
  id: 'nces-ipeds-postsecondary-2009',
  url: 'https://datos.estadisticas.pr/dataset/e85bd998-dbfd-4385-aed5-8e5ce4439ed2/resource/15512525-1839-4636-8eb1-db08d09894d5/download/ipeds_prhd2009.csv'
};

var OUTPUT_PATH = path.join(__dirname, '..', 'data', 'unis', 'ipeds-geocode-audit.json');

function fetchText(url) {
  return childProcess.execFileSync('curl', ['-L', '--silent', '--fail', url], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
}

function parseCsv(text) {
  var rows = [];
  var row = [];
  var cell = '';
  var inQuotes = false;
  var i;
  var char;
  var nextChar;

  for (i = 0; i < text.length; i += 1) {
    char = text[i];
    nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char !== '\r') {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

function parseCsvObjects(text) {
  var rows = parseCsv(text);
  var headers = rows.shift().map(function(header) {
    return String(header || '').replace(/^\uFEFF/, '');
  });

  return rows
    .filter(function(row) {
      return row.some(function(value) {
        return String(value).trim() !== '';
      });
    })
    .map(function(row) {
      var record = {};

      headers.forEach(function(header, index) {
        record[header] = row[index] || '';
      });

      return record;
    });
}

function normalizeText(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compareByInstitution(left, right) {
  return String(left.directoryInstitution || '').localeCompare(String(right.directoryInstitution || ''));
}

function main() {
  var directoryRows = parseCsvObjects(fetchText(DIRECTORY_SOURCE.url));
  var coordinateRows = parseCsvObjects(fetchText(COORDINATE_SOURCE.url));
  var coordinateIndex = Object.create(null);
  var exactMatches = [];
  var unmatchedInstitutions = [];

  coordinateRows.forEach(function(row) {
    var key = normalizeText(row.city) + '|' + normalizeText(row.instnm);

    if (!coordinateIndex[key]) {
      coordinateIndex[key] = [];
    }

    coordinateIndex[key].push(row);
  });

  directoryRows.forEach(function(row) {
    var key = normalizeText(row.Pueblo) + '|' + normalizeText(row['Nombre de la Institución']);
    var candidates = coordinateIndex[key] || [];

    if (candidates.length === 1) {
      exactMatches.push({
        directoryInstitution: row['Nombre de la Institución'],
        directoryMunicipality: row.Pueblo,
        directoryAddress: [row['Dirección Física'], row['Dirección Física 2']].filter(Boolean).join(', '),
        coordinateInstitution: candidates[0].instnm,
        coordinateMunicipality: candidates[0].city,
        latitude: candidates[0].latitude,
        longitude: candidates[0].longitud,
        unitid: candidates[0].unitid,
        matchRule: 'normalized exact institution name + municipality'
      });
      return;
    }

    unmatchedInstitutions.push({
      directoryInstitution: row['Nombre de la Institución'],
      directoryMunicipality: row.Pueblo,
      directoryAddress: [row['Dirección Física'], row['Dirección Física 2']].filter(Boolean).join(', '),
      candidateCount: candidates.length,
      reason: candidates.length === 0 ? 'no exact normalized institution-name + municipality match in auxiliary source' : 'multiple exact normalized institution-name + municipality matches in auxiliary source'
    });
  });

  exactMatches.sort(compareByInstitution);
  unmatchedInstitutions.sort(compareByInstitution);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    schemaVersion: 1,
    status: exactMatches.length === directoryRows.length ? 'ready' : 'blocked',
    reviewedAt: new Date().toISOString().slice(0, 10),
    buildCommand: 'node scripts/audit_unis_geocode_candidates.js',
    matchRule: 'normalized exact institution name + municipality only; no alias expansion, no fuzzy matching, no manual overrides',
    summary: {
      totalDirectoryInstitutions: directoryRows.length,
      exactMatchCount: exactMatches.length,
      unmatchedCount: unmatchedInstitutions.length
    },
    sources: [
      DIRECTORY_SOURCE,
      COORDINATE_SOURCE
    ],
    exactMatches: exactMatches,
    unmatchedInstitutions: unmatchedInstitutions,
    nextDecision: 'Approve a reviewed alias and campus-match policy, or choose a different Puerto Rico coordinate source before marking unis import-ready.'
  }, null, 2) + '\n');

  process.stdout.write('wrote geocode audit to ' + OUTPUT_PATH + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exit(1);
}
