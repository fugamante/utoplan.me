'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var planner = require('../scripts/data_import_plan');

var fixtures = {
  cbps: [
    {
      fipscty: '001',
      cencty: '001',
      naics: '541',
      emp: '653',
      ap: '11348',
      est: '128',
      NAICS2012_TTL: 'Professional Services'
    },
    {
      fipscty: '001',
      cencty: '001',
      naics: '23----',
      emp: '0',
      ap: '0',
      est: '6',
      NAICS2012_TTL: 'Construction'
    }
  ],
  muns: [
    {
      municipio: '  San   Juan  ',
      countyfp: '127',
      cntyidfp: '72127'
    },
    {
      municipio: '',
      countyfp: '001'
    }
  ],
  unis: [
    {
      'Nombre de la Institución': 'American University of Puerto Rico',
      'Unidad Académica': '',
      'Principal Ejecutivo': 'Juan Nazario Torres',
      Telefono: '(787) 620-2040',
      'Dirección Pág Web': 'www.aupr.edu',
      'Correo Electrónico': 'jcnazario@aupr.edu',
      'Dirección Física': 'Carr # 2 KM 14.0',
      'Dirección Física 2': 'Barrio Hato Tejas',
      Pueblo: 'BAYAMON'
    },
    {
      'Nombre de la Institución': 'Sample College',
      'Dirección Física': 'Main Street',
      'Dirección Física 2': '',
      Pueblo: 'San Juan'
    },
    {
      'Nombre de la Institución': 'Unknown Institute',
      'Dirección Física': 'No Match',
      'Dirección Física 2': '',
      Pueblo: 'Ponce'
    }
  ],
  unisCoordinates: [
    {
      NAME: 'American University of Puerto Rico',
      STREET: 'Carr. #2, Km.14.4, Bo. Hato Tejas',
      CITY: 'Bayamon',
      LAT: 18.407058,
      LON: -66.186631
    },
    {
      NAME: 'Sample College',
      STREET: 'North Campus',
      CITY: 'San Juan',
      LAT: 18,
      LON: -66
    },
    {
      NAME: 'Sample College',
      STREET: 'South Campus',
      CITY: 'San Juan',
      LAT: 18.1,
      LON: -66.1
    }
  ]
};
var plan = planner.planFixtureRows(fixtures);

assert.deepStrictEqual(plan.tables, {
  cbps: {
    accepted: 1,
    rejected: 1,
    manualReview: 0
  },
  muns: {
    accepted: 1,
    rejected: 1,
    manualReview: 0
  },
  unis: {
    accepted: 1,
    rejected: 0,
    manualReview: 2
  }
});

assert.strictEqual(plan.accepted.length, 3);
assert.strictEqual(plan.rejected.length, 2);
assert.strictEqual(plan.manualReview.length, 2);

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'cbps';
})[0].record, {
  total_indus: 653,
  total_anual: 11348,
  cnaic: 541,
  cnaic_name: 'Professional Services',
  county: 1,
  num_est: 128
});

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'muns';
})[0].record, {
  title: 'San Juan',
  county: 127
});

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'unis';
})[0].record, {
  title: 'American University of Puerto Rico',
  address: 'Carr # 2 KM 14.0, Barrio Hato Tejas, BAYAMON',
  desc: 'Juan Nazario Torres | (787) 620-2040 | www.aupr.edu | jcnazario@aupr.edu',
  lat: 18.407058,
  long: -66.186631
});

assert(plan.rejected.some(function(item) {
  return item.table === 'cbps' && item.reason.indexOf('NAICS code must be numeric') !== -1;
}));

assert(plan.rejected.some(function(item) {
  return item.table === 'muns' && item.reason.indexOf('municipality title is required') !== -1;
}));

assert(plan.manualReview.some(function(item) {
  return item.table === 'unis' && item.reason.indexOf('multiple coordinate rows') !== -1;
}));

assert(plan.manualReview.some(function(item) {
  return item.table === 'unis' && item.reason.indexOf('no exact normalized name') !== -1;
}));

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-data-plan-'));
var fixturePath = path.join(tmpDir, 'fixtures.json');
var outPath = path.join(tmpDir, 'report.json');
var cliResult;
var report;
var failedResult;
var sampleFixturePath = path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-fixtures.json');
var sampleReportPath = path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json');
var sampleOutPath = path.join(tmpDir, 'sample-report.json');
var sampleCsvOutPath = path.join(tmpDir, 'sample-csv-report.json');
var sampleResult;
var sampleCsvResult;

fs.writeFileSync(fixturePath, JSON.stringify(fixtures, null, 2));

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--fixtures=' + fixturePath,
  '--out=' + outPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.strictEqual(cliResult.stderr, '');
assert(fs.existsSync(outPath));

report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
assert.deepStrictEqual(report.tables, plan.tables);
assert.strictEqual(report.accepted.length, plan.accepted.length);
assert.strictEqual(report.rejected.length, plan.rejected.length);
assert.strictEqual(report.manualReview.length, plan.manualReview.length);

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js'
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing fixture input') !== -1);

sampleResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--fixtures=' + sampleFixturePath,
  '--out=' + sampleOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(sampleResult.status, 0);
assert.deepStrictEqual(
  JSON.parse(fs.readFileSync(sampleOutPath, 'utf8')),
  JSON.parse(fs.readFileSync(sampleReportPath, 'utf8'))
);

assert.deepStrictEqual(planner.rowsFromCsv('a,b\n\"x,y\",z\n'), [
  {
    a: 'x,y',
    b: 'z'
  }
]);

sampleCsvResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cbps-csv=data/fixtures/non-production/cbps.csv',
  '--muns-csv=data/fixtures/non-production/muns.csv',
  '--unis-csv=data/fixtures/non-production/unis.csv',
  '--unis-coordinates-csv=data/fixtures/non-production/unis-coordinates.csv',
  '--out=' + sampleCsvOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(sampleCsvResult.status, 0);
assert.deepStrictEqual(
  JSON.parse(fs.readFileSync(sampleCsvOutPath, 'utf8')),
  JSON.parse(fs.readFileSync(sampleReportPath, 'utf8'))
);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
