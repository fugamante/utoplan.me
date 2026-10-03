#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var TITLE_URL = 'https://www2.census.gov/programs-surveys/cbp/technical-documentation/reference/naics-descriptions/naics2012.txt';
var AGGREGATE_URL = 'https://datos.estadisticas.pr/dataset/b0e448f9-d41a-4064-8536-a1b8b2b9f04b/resource/4503472e-77a7-4b29-b4aa-8945cfa7664c/download/cbp14pr.csv';
var MUNICIPAL_URL = 'https://datos.estadisticas.pr/dataset/b0e448f9-d41a-4064-8536-a1b8b2b9f04b/resource/4828e082-6c0d-4d3f-be12-ab6aeb34eb59/download/cbp14pr_mun.csv';
var OUTPUT_PATH = path.join(__dirname, '..', 'data', 'naics', 'cbp-naics-titles.json');

function fetchText(url) {
  return childProcess.execFileSync('curl', ['-L', '--silent', '--fail', url], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
}

function parseTitleCsv(text) {
  var lines = text.trim().split(/\r?\n/);
  var titles = Object.create(null);

  lines.slice(1).forEach(function(line) {
    var match = line.match(/^"([^"]+)","(.*)"$/);
    if (!match) {
      throw new Error('invalid title registry row: ' + line);
    }

    titles[match[1]] = match[2].replace(/""/g, '"');
  });

  return titles;
}

function collectCodes(text) {
  var lines = text.trim().split(/\r?\n/);
  var headers = lines[0].split(',');
  var naicsIndex = headers.indexOf('naics');
  var codes = Object.create(null);

  if (naicsIndex === -1) {
    throw new Error('missing naics column in CBP source header');
  }

  lines.slice(1).forEach(function(line) {
    if (!line) {
      return;
    }

    var columns = line.split(',');
    var code = (columns[naicsIndex] || '').trim();
    if (code) {
      codes[code] = true;
    }
  });

  return Object.keys(codes);
}

function main() {
  var titleText = fetchText(TITLE_URL);
  var aggregateText = fetchText(AGGREGATE_URL);
  var municipalText = fetchText(MUNICIPAL_URL);
  var titles = parseTitleCsv(titleText);
  var codeSet = Object.create(null);

  collectCodes(aggregateText).forEach(function(code) {
    codeSet[code] = true;
  });
  collectCodes(municipalText).forEach(function(code) {
    codeSet[code] = true;
  });

  var codes = Object.keys(codeSet).sort();
  var missing = codes.filter(function(code) {
    return !Object.prototype.hasOwnProperty.call(titles, code);
  });

  if (missing.length > 0) {
    throw new Error('missing title coverage for codes: ' + missing.slice(0, 20).join(', '));
  }

  var artifact = {
    schemaVersion: 1,
    scope: 'puerto-rico-cbp-naics-titles',
    retrievedAt: new Date().toISOString().slice(0, 10),
    buildCommand: 'node scripts/sync_naics_registry.js',
    sourceIds: [
      'datospr-cbp-2014-puerto-rico',
      'datospr-cbp-2014-municipios',
      'census-cbp-2014-state-72-fallback'
    ],
    sourceUrls: {
      titleReference: TITLE_URL,
      aggregateCbp: AGGREGATE_URL,
      municipalCbp: MUNICIPAL_URL
    },
    codeCount: codes.length,
    entries: codes.map(function(code) {
      return {
        code: code,
        title: titles[code]
      };
    })
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(artifact, null, 2) + '\n');
  process.stdout.write('wrote ' + artifact.codeCount + ' NAICS titles to ' + OUTPUT_PATH + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exit(1);
}
