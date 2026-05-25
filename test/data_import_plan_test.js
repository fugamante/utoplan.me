'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var zlib = require('zlib');
var planner = require('../scripts/data_import_plan');

function fixedWidth(value, length) {
  var text = String(value || '');

  if (text.length > length) {
    return text.slice(0, length);
  }

  return text + new Array(length - text.length + 1).join(' ');
}

function buildDbf(rows, fields) {
  var headerLength = 32 + (fields.length * 32) + 1;
  var rowLength = 1 + fields.reduce(function(total, field) {
    return total + field.length;
  }, 0);
  var buffer = Buffer.alloc(headerLength + (rows.length * rowLength) + 1, 0);
  var offset = 32;
  var rowOffset;

  buffer[0] = 0x03;
  buffer[1] = 126;
  buffer[2] = 4;
  buffer[3] = 25;
  buffer.writeUInt32LE(rows.length, 4);
  buffer.writeUInt16LE(headerLength, 8);
  buffer.writeUInt16LE(rowLength, 10);

  fields.forEach(function(field) {
    Buffer.from(field.name, 'ascii').copy(buffer, offset, 0, Math.min(field.name.length, 10));
    buffer[offset + 11] = field.type.charCodeAt(0);
    buffer[offset + 16] = field.length;
    offset += 32;
  });
  buffer[offset] = 0x0d;

  rows.forEach(function(row, index) {
    var fieldOffset;

    rowOffset = headerLength + (index * rowLength);
    buffer[rowOffset] = 0x20;
    fieldOffset = rowOffset + 1;
    fields.forEach(function(field) {
      Buffer.from(fixedWidth(row[field.name], field.length), 'latin1').copy(buffer, fieldOffset);
      fieldOffset += field.length;
    });
  });
  buffer[buffer.length - 1] = 0x1a;

  return buffer;
}

function buildZipEntry(fileName, content, options) {
  var compressed = options && options.deflate ? zlib.deflateRawSync(content) : content;
  var method = options && options.deflate ? 8 : 0;

  return {
    fileName: fileName,
    content: content,
    compressed: compressed,
    method: method
  };
}

function buildZip(entries) {
  var localParts = [];
  var centralParts = [];
  var localOffset = 0;

  entries.forEach(function(entry) {
    var name = Buffer.from(entry.fileName, 'utf8');
    var local = Buffer.alloc(30 + name.length);
    var central = Buffer.alloc(46 + name.length);

    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.method, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(entry.compressed.length, 18);
    local.writeUInt32LE(entry.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, entry.compressed);

    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(entry.method, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(entry.compressed.length, 20);
    central.writeUInt32LE(entry.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);

    localOffset += local.length + entry.compressed.length;
  });

  var localBuffer = Buffer.concat(localParts);
  var centralBuffer = Buffer.concat(centralParts);
  var eocd = Buffer.alloc(22);

  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(localBuffer.length, 16);

  return Buffer.concat([localBuffer, centralBuffer, eocd]);
}

function municipalityZip(rows) {
  return buildZip([
    buildZipEntry('mapa-oficial-municipios/municipios.dbf', buildDbf(rows, [
      {
        name: 'municipio',
        type: 'C',
        length: 32
      },
      {
        name: 'countyfp',
        type: 'C',
        length: 3
      },
      {
        name: 'cntyidfp',
        type: 'C',
        length: 5
      },
      {
        name: 'statefp',
        type: 'C',
        length: 2
      }
    ]), {
      deflate: true
    })
  ]);
}

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
  desc: 'www.aupr.edu',
  lat: 18.407058,
  long: -66.186631
});

assert.strictEqual(plan.accepted.filter(function(item) {
  return item.table === 'unis';
})[0].record.desc.indexOf('@'), -1);
assert.strictEqual(plan.accepted.filter(function(item) {
  return item.table === 'unis';
})[0].record.desc.indexOf('(787)'), -1);
assert.strictEqual(plan.accepted.filter(function(item) {
  return item.table === 'unis';
})[0].record.desc.indexOf('Juan Nazario Torres'), -1);

assert(plan.rejected.some(function(item) {
  return item.table === 'cbps' && item.reason.indexOf('NAICS code must be numeric') !== -1;
}));

assert(plan.rejected.some(function(item) {
  return item.table === 'muns' && item.reason.indexOf('municipality title is required') !== -1;
}));

assert(planner.planMunicipalityRows([
  {
    municipio: 'Miami',
    countyfp: '086',
    cntyidfp: '12086',
    statefp: '12'
  }
]).rejected.some(function(item) {
  return item.reason === 'municipality row must be Puerto Rico statefp 72';
}));

assert(planner.planMunicipalityRows([
  {
    municipio: 'Adjuntas',
    countyfp: '',
    cntyidfp: '',
    statefp: '72'
  }
]).rejected.some(function(item) {
  return item.reason.indexOf('municipality county code must be numeric') !== -1;
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
var cacheDir = path.join(tmpDir, 'cache');
var cachedOutPath = path.join(tmpDir, 'cached-report.json');
var extractedCacheDir = path.join(tmpDir, 'extracted-cache');
var extractedCachedOutPath = path.join(tmpDir, 'extracted-cached-report.json');
var zipCacheDir = path.join(tmpDir, 'zip-cache');
var zipCachedOutPath = path.join(tmpDir, 'zip-cached-report.json');
var corruptZipCacheDir = path.join(tmpDir, 'corrupt-zip-cache');
var corruptZipCachedOutPath = path.join(tmpDir, 'corrupt-zip-cached-report.json');
var missingDbfCacheDir = path.join(tmpDir, 'missing-dbf-cache');
var missingDbfCachedOutPath = path.join(tmpDir, 'missing-dbf-cached-report.json');
var ambiguousDbfCacheDir = path.join(tmpDir, 'ambiguous-dbf-cache');
var ambiguousDbfCachedOutPath = path.join(tmpDir, 'ambiguous-dbf-cached-report.json');
var sampleResult;
var sampleCsvResult;
var cachedResult;
var extractedCachedResult;
var zipCachedResult;
var corruptZipCachedResult;
var missingDbfCachedResult;
var ambiguousDbfCachedResult;

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

fs.mkdirSync(cacheDir);
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'cbps.csv'), path.join(cacheDir, 'datospr-cbp-2014-municipios.csv'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'unis.csv'), path.join(cacheDir, 'datospr-higher-ed-directory-2017-18.csv'));
fs.writeFileSync(path.join(cacheDir, 'nces-edge-postsecondary-locations-2021-pr.json'), JSON.stringify({
  features: fixtures.unisCoordinates.map(function(row) {
    return {
      attributes: row
    };
  })
}));
fs.writeFileSync(path.join(cacheDir, 'datospr-official-municipality-boundaries.zip'), 'not-a-real-zip');

[
  ['datospr-cbp-2014-municipios', 'datospr-cbp-2014-municipios.csv'],
  ['datospr-higher-ed-directory-2017-18', 'datospr-higher-ed-directory-2017-18.csv'],
  ['nces-edge-postsecondary-locations-2021-pr', 'nces-edge-postsecondary-locations-2021-pr.json'],
  ['datospr-official-municipality-boundaries', 'datospr-official-municipality-boundaries.zip']
].forEach(function(entry) {
  fs.writeFileSync(path.join(cacheDir, entry[0] + '.metadata.json'), JSON.stringify({
    id: entry[0],
    dataPath: entry[1]
  }));
});

cachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + cacheDir,
  '--out=' + cachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cachedResult.status, 0);
var cachedPlan = JSON.parse(fs.readFileSync(cachedOutPath, 'utf8'));
assert.strictEqual(cachedPlan.tables.cbps.accepted, 1);
assert.strictEqual(cachedPlan.tables.cbps.rejected, 1);
assert.strictEqual(cachedPlan.tables.muns.accepted, 0);
assert.strictEqual(cachedPlan.tables.muns.rejected, 0);
assert.strictEqual(cachedPlan.tables.unis.accepted, 1);
assert.strictEqual(cachedPlan.tables.unis.manualReview, 2);
assert.deepStrictEqual(cachedPlan.unsupportedCacheSources, [
  'datospr-official-municipality-boundaries'
]);
assert.strictEqual(cachedPlan.unsupportedCacheSourceErrors[0].reason, 'ZIP end-of-central-directory record was not found');

fs.mkdirSync(extractedCacheDir);
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'cbps.csv'), path.join(extractedCacheDir, 'datospr-cbp-2014-municipios.csv'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'unis.csv'), path.join(extractedCacheDir, 'datospr-higher-ed-directory-2017-18.csv'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'official-municipality-boundaries-extract.csv'), path.join(extractedCacheDir, 'datospr-official-municipality-boundaries.csv'));
fs.writeFileSync(path.join(extractedCacheDir, 'nces-edge-postsecondary-locations-2021-pr.json'), JSON.stringify({
  features: fixtures.unisCoordinates.map(function(row) {
    return {
      attributes: row
    };
  })
}));

[
  ['datospr-cbp-2014-municipios', 'datospr-cbp-2014-municipios.csv'],
  ['datospr-higher-ed-directory-2017-18', 'datospr-higher-ed-directory-2017-18.csv'],
  ['nces-edge-postsecondary-locations-2021-pr', 'nces-edge-postsecondary-locations-2021-pr.json'],
  ['datospr-official-municipality-boundaries', 'datospr-official-municipality-boundaries.csv']
].forEach(function(entry) {
  fs.writeFileSync(path.join(extractedCacheDir, entry[0] + '.metadata.json'), JSON.stringify({
    id: entry[0],
    dataPath: entry[1]
  }));
});

extractedCachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + extractedCacheDir,
  '--out=' + extractedCachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(extractedCachedResult.status, 0);
var extractedCachedPlan = JSON.parse(fs.readFileSync(extractedCachedOutPath, 'utf8'));
assert.strictEqual(extractedCachedPlan.tables.muns.accepted, 3);
assert.strictEqual(extractedCachedPlan.tables.muns.rejected, 0);
assert.strictEqual(extractedCachedPlan.accepted.filter(function(item) {
  return item.table === 'muns';
}).length, 3);
assert.deepStrictEqual(extractedCachedPlan.accepted.filter(function(item) {
  return item.table === 'muns' && item.record.title === 'Bayamon';
})[0].record, {
  title: 'Bayamon',
  county: 21
});
assert.deepStrictEqual(extractedCachedPlan.unsupportedCacheSources || [], []);

fs.mkdirSync(zipCacheDir);
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'cbps.csv'), path.join(zipCacheDir, 'datospr-cbp-2014-municipios.csv'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'unis.csv'), path.join(zipCacheDir, 'datospr-higher-ed-directory-2017-18.csv'));
fs.writeFileSync(path.join(zipCacheDir, 'nces-edge-postsecondary-locations-2021-pr.json'), JSON.stringify({
  features: fixtures.unisCoordinates.map(function(row) {
    return {
      attributes: row
    };
  })
}));
fs.writeFileSync(path.join(zipCacheDir, 'datospr-official-municipality-boundaries.zip'), municipalityZip([
  {
    municipio: 'Adjuntas',
    countyfp: '001',
    cntyidfp: '72001',
    statefp: '72'
  },
  {
    municipio: 'Bayamon',
    countyfp: '021',
    cntyidfp: '72021',
    statefp: '72'
  },
  {
    municipio: 'San Juan',
    countyfp: '127',
    cntyidfp: '72127',
    statefp: '72'
  }
]));

[
  ['datospr-cbp-2014-municipios', 'datospr-cbp-2014-municipios.csv'],
  ['datospr-higher-ed-directory-2017-18', 'datospr-higher-ed-directory-2017-18.csv'],
  ['nces-edge-postsecondary-locations-2021-pr', 'nces-edge-postsecondary-locations-2021-pr.json'],
  ['datospr-official-municipality-boundaries', 'datospr-official-municipality-boundaries.zip']
].forEach(function(entry) {
  fs.writeFileSync(path.join(zipCacheDir, entry[0] + '.metadata.json'), JSON.stringify({
    id: entry[0],
    dataPath: entry[1]
  }));
});

zipCachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + zipCacheDir,
  '--out=' + zipCachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(zipCachedResult.status, 0);
var zipCachedPlan = JSON.parse(fs.readFileSync(zipCachedOutPath, 'utf8'));
assert.strictEqual(zipCachedPlan.tables.muns.accepted, 3);
assert.strictEqual(zipCachedPlan.tables.muns.rejected, 0);
assert.deepStrictEqual(zipCachedPlan.accepted.filter(function(item) {
  return item.table === 'muns' && item.record.title === 'Bayamon';
})[0].record, {
  title: 'Bayamon',
  county: 21
});
assert.deepStrictEqual(zipCachedPlan.unsupportedCacheSources || [], []);

fs.mkdirSync(corruptZipCacheDir);
fs.writeFileSync(path.join(corruptZipCacheDir, 'datospr-official-municipality-boundaries.zip'), 'not-a-real-zip');
fs.writeFileSync(path.join(corruptZipCacheDir, 'datospr-official-municipality-boundaries.metadata.json'), JSON.stringify({
  id: 'datospr-official-municipality-boundaries',
  dataPath: 'datospr-official-municipality-boundaries.zip'
}));

corruptZipCachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + corruptZipCacheDir,
  '--out=' + corruptZipCachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(corruptZipCachedResult.status, 0);
var corruptZipCachedPlan = JSON.parse(fs.readFileSync(corruptZipCachedOutPath, 'utf8'));
assert.deepStrictEqual(corruptZipCachedPlan.unsupportedCacheSources, [
  'datospr-official-municipality-boundaries'
]);
assert.strictEqual(corruptZipCachedPlan.unsupportedCacheSourceErrors[0].reason, 'ZIP end-of-central-directory record was not found');

fs.mkdirSync(missingDbfCacheDir);
fs.writeFileSync(path.join(missingDbfCacheDir, 'datospr-official-municipality-boundaries.zip'), buildZip([
  buildZipEntry('readme.txt', Buffer.from('no attribute table', 'utf8'), {})
]));
fs.writeFileSync(path.join(missingDbfCacheDir, 'datospr-official-municipality-boundaries.metadata.json'), JSON.stringify({
  id: 'datospr-official-municipality-boundaries',
  dataPath: 'datospr-official-municipality-boundaries.zip'
}));

missingDbfCachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + missingDbfCacheDir,
  '--out=' + missingDbfCachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(missingDbfCachedResult.status, 0);
var missingDbfCachedPlan = JSON.parse(fs.readFileSync(missingDbfCachedOutPath, 'utf8'));
assert.deepStrictEqual(missingDbfCachedPlan.unsupportedCacheSources, [
  'datospr-official-municipality-boundaries'
]);
assert.strictEqual(missingDbfCachedPlan.unsupportedCacheSourceErrors[0].reason, 'official municipality boundary ZIP does not include a DBF attribute table');

fs.mkdirSync(ambiguousDbfCacheDir);
fs.writeFileSync(path.join(ambiguousDbfCacheDir, 'datospr-official-municipality-boundaries.zip'), buildZip([
  buildZipEntry('left.dbf', buildDbf([], [
    {
      name: 'municipio',
      type: 'C',
      length: 32
    }
  ]), {}),
  buildZipEntry('right.dbf', buildDbf([], [
    {
      name: 'municipio',
      type: 'C',
      length: 32
    }
  ]), {})
]));
fs.writeFileSync(path.join(ambiguousDbfCacheDir, 'datospr-official-municipality-boundaries.metadata.json'), JSON.stringify({
  id: 'datospr-official-municipality-boundaries',
  dataPath: 'datospr-official-municipality-boundaries.zip'
}));

ambiguousDbfCachedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_import_plan.js',
  '--cache-dir=' + ambiguousDbfCacheDir,
  '--out=' + ambiguousDbfCachedOutPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(ambiguousDbfCachedResult.status, 0);
var ambiguousDbfCachedPlan = JSON.parse(fs.readFileSync(ambiguousDbfCachedOutPath, 'utf8'));
assert.deepStrictEqual(ambiguousDbfCachedPlan.unsupportedCacheSources, [
  'datospr-official-municipality-boundaries'
]);
assert.strictEqual(ambiguousDbfCachedPlan.unsupportedCacheSourceErrors[0].reason, 'official municipality boundary ZIP must include one municipios.dbf attribute table');

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
