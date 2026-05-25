'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var normalization = require('./data_normalization');

var CACHE_SOURCE_KEYS = {
  'datospr-cbp-2014-municipios': 'cbps',
  'datospr-official-municipality-boundaries': 'muns',
  'datospr-higher-ed-directory-2017-18': 'unis',
  'nces-edge-postsecondary-locations-2021-pr': 'unisCoordinates'
};

function readArg(args, name, defaultValue) {
  var prefix = '--' + name + '=';
  var value = defaultValue;

  args.forEach(function(arg) {
    if (arg.indexOf(prefix) === 0) {
      value = arg.slice(prefix.length);
    }
  });

  return value;
}

function parseCsv(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;
  var index;
  var current;
  var next;

  for (index = 0; index < text.length; index += 1) {
    current = text[index];
    next = text[index + 1];

    if (inQuotes) {
      if (current === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (current === '"') {
        inQuotes = false;
      } else {
        field += current;
      }
      continue;
    }

    if (current === '"') {
      inQuotes = true;
    } else if (current === ',') {
      row.push(field);
      field = '';
    } else if (current === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (current !== '\r') {
      field += current;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error('CSV has an unterminated quoted field');
  }

  return rows;
}

function rowsFromCsv(text) {
  var parsed = parseCsv(text).filter(function(row) {
    return row.some(function(value) {
      return String(value).trim() !== '';
    });
  });
  var headers;

  if (parsed.length === 0) {
    return [];
  }

  headers = parsed[0];
  return parsed.slice(1).map(function(row) {
    return headers.reduce(function(record, header, index) {
      record[header] = row[index] || '';
      return record;
    }, {});
  });
}

function issue(table, sourceId, rowIndex, reason, row) {
  return {
    table: table,
    sourceId: sourceId,
    rowIndex: rowIndex,
    reason: reason,
    row: row
  };
}

function planCbpRows(rows, options) {
  var sourceId = options && options.sourceId ? options.sourceId : 'datospr-cbp-2014-municipios';
  var plan = {
    table: 'cbps',
    accepted: [],
    rejected: [],
    manualReview: []
  };

  rows.forEach(function(row, index) {
    var naics = normalization.normalizeNaics(row.naics);
    var county = normalization.normalizeCbpCounty(row);
    var annual = normalization.normalizeIntegerCode(row.ap, 'annual payroll');
    var establishments = normalization.normalizeIntegerCode(row.est, 'establishment count');
    var employment = normalization.normalizeIntegerCode(row.emp, 'employment count');

    if (!naics.ok) {
      plan.rejected.push(issue('cbps', sourceId, index, naics.reason, row));
      return;
    }

    if (!county.ok || !annual.ok || !establishments.ok || !employment.ok) {
      plan.rejected.push(issue('cbps', sourceId, index, [
        county.reason,
        annual.reason,
        establishments.reason,
        employment.reason
      ].filter(Boolean).join('; '), row));
      return;
    }

    plan.accepted.push({
      table: 'cbps',
      sourceId: sourceId,
      rowIndex: index,
      record: {
        total_indus: employment.value,
        total_anual: annual.value,
        cnaic: naics.value,
        cnaic_name: row.NAICS2012_TTL || null,
        county: county.value,
        num_est: establishments.value
      }
    });
  });

  return plan;
}

function planMunicipalityRows(rows, options) {
  var sourceId = options && options.sourceId ? options.sourceId : 'datospr-official-municipality-boundaries';
  var plan = {
    table: 'muns',
    accepted: [],
    rejected: [],
    manualReview: []
  };

  rows.forEach(function(row, index) {
    var title = normalization.normalizeMunTitle(row.municipio);
    var county = normalization.normalizeMunCounty(row);
    var state = row.statefp === null || row.statefp === undefined ? '' : String(row.statefp).trim();

    if (state && state !== '72') {
      plan.rejected.push(issue('muns', sourceId, index, 'municipality row must be Puerto Rico statefp 72', row));
      return;
    }

    if (!title.ok || !county.ok) {
      plan.rejected.push(issue('muns', sourceId, index, [
        title.reason,
        county.reason
      ].filter(Boolean).join('; '), row));
      return;
    }

    plan.accepted.push({
      table: 'muns',
      sourceId: sourceId,
      rowIndex: index,
      record: {
        title: title.value,
        county: county.value
      }
    });
  });

  return plan;
}

function buildUniversityAddress(row) {
  return [row['Dirección Física'], row['Dirección Física 2'], row.Pueblo]
    .filter(function(value) {
      return value !== null && value !== undefined && String(value).trim() !== '';
    })
    .join(', ');
}

function buildUniversityDescription(row) {
  return [
    row['Unidad Académica'],
    row['Dirección Pág Web']
  ].filter(function(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }).join(' | ');
}

function planUniversityRows(directoryRows, coordinateRows, options) {
  var sourceId = options && options.sourceId ? options.sourceId : 'datospr-higher-ed-directory-2017-18';
  var plan = {
    table: 'unis',
    accepted: [],
    rejected: [],
    manualReview: []
  };

  directoryRows.forEach(function(row, index) {
    var title = String(row['Nombre de la Institución'] || '').trim();

    if (!title) {
      plan.rejected.push(issue('unis', sourceId, index, 'institution title is required', row));
      return;
    }

    var coordinateMatch = normalization.joinUniversityCoordinates(row, coordinateRows);

    if (!coordinateMatch.ok) {
      plan.manualReview.push(issue('unis', sourceId, index, coordinateMatch.reason, row));
      return;
    }

    plan.accepted.push({
      table: 'unis',
      sourceId: sourceId,
      rowIndex: index,
      record: {
        title: title,
        address: buildUniversityAddress(row),
        desc: buildUniversityDescription(row),
        lat: coordinateMatch.value.lat,
        long: coordinateMatch.value.long
      },
      match: {
        sourceId: 'nces-edge-postsecondary-locations-2021-pr',
        score: coordinateMatch.value.matchScore
      }
    });
  });

  return plan;
}

function combinePlans(plans) {
  return plans.reduce(function(summary, plan) {
    summary.tables[plan.table] = {
      accepted: plan.accepted.length,
      rejected: plan.rejected.length,
      manualReview: plan.manualReview.length
    };

    summary.accepted = summary.accepted.concat(plan.accepted);
    summary.rejected = summary.rejected.concat(plan.rejected);
    summary.manualReview = summary.manualReview.concat(plan.manualReview);
    return summary;
  }, {
    accepted: [],
    rejected: [],
    manualReview: [],
    tables: {}
  });
}

function planFixtureRows(fixtures) {
  var plan = combinePlans([
    planCbpRows(fixtures.cbps || []),
    planMunicipalityRows(fixtures.muns || []),
    planUniversityRows(fixtures.unis || [], fixtures.unisCoordinates || [])
  ]);

  if (fixtures.unsupportedCacheSources && fixtures.unsupportedCacheSources.length > 0) {
    plan.unsupportedCacheSources = fixtures.unsupportedCacheSources.slice();
  }

  if (fixtures.unsupportedCacheSourceErrors && fixtures.unsupportedCacheSourceErrors.length > 0) {
    plan.unsupportedCacheSourceErrors = fixtures.unsupportedCacheSourceErrors.slice();
  }

  return plan;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readCsvFile(filePath) {
  return rowsFromCsv(fs.readFileSync(filePath, 'utf8'));
}

function trimBinaryText(value) {
  return String(value || '').replace(/\0/g, '').trim();
}

function readZipEntries(buffer) {
  var eocdOffset = -1;
  var maxSearch = Math.max(0, buffer.length - 65557);
  var offset;
  var entryCount;
  var centralOffset;
  var entries = {};
  var index;

  for (offset = buffer.length - 22; offset >= maxSearch; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('ZIP end-of-central-directory record was not found');
  }

  entryCount = buffer.readUInt16LE(eocdOffset + 10);
  centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  offset = centralOffset;

  for (index = 0; index < entryCount; index += 1) {
    var compressionMethod;
    var compressedSize;
    var fileNameLength;
    var extraLength;
    var commentLength;
    var localHeaderOffset;
    var fileName;
    var localNameLength;
    var localExtraLength;
    var dataOffset;
    var compressed;
    var content;

    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('ZIP central-directory entry is invalid');
    }

    compressionMethod = buffer.readUInt16LE(offset + 10);
    compressedSize = buffer.readUInt32LE(offset + 20);
    fileNameLength = buffer.readUInt16LE(offset + 28);
    extraLength = buffer.readUInt16LE(offset + 30);
    commentLength = buffer.readUInt16LE(offset + 32);
    localHeaderOffset = buffer.readUInt32LE(offset + 42);
    fileName = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error('ZIP local file header is invalid for ' + fileName);
    }

    localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    compressed = buffer.slice(dataOffset, dataOffset + compressedSize);

    if (compressionMethod === 0) {
      content = compressed;
    } else if (compressionMethod === 8) {
      content = zlib.inflateRawSync(compressed);
    } else {
      throw new Error('ZIP entry ' + fileName + ' uses unsupported compression method ' + compressionMethod);
    }

    entries[fileName] = content;
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readDbfRows(buffer) {
  var rowCount;
  var headerLength;
  var rowLength;
  var fields = [];
  var offset = 32;
  var rows = [];
  var rowIndex;

  if (buffer.length < 33) {
    throw new Error('DBF file is too small');
  }

  rowCount = buffer.readUInt32LE(4);
  headerLength = buffer.readUInt16LE(8);
  rowLength = buffer.readUInt16LE(10);

  while (offset < headerLength && buffer[offset] !== 0x0d) {
    var name = trimBinaryText(buffer.slice(offset, offset + 11).toString('latin1'));
    var type = String.fromCharCode(buffer[offset + 11]);
    var length = buffer[offset + 16];

    if (name) {
      fields.push({
        name: name.toLowerCase(),
        type: type,
        length: length
      });
    }

    offset += 32;
  }

  if (fields.length === 0) {
    throw new Error('DBF file has no field descriptors');
  }

  for (rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    var rowOffset = headerLength + (rowIndex * rowLength);
    var fieldOffset = rowOffset + 1;
    var record = {};

    if (rowOffset + rowLength > buffer.length) {
      throw new Error('DBF record extends beyond file length');
    }

    if (buffer[rowOffset] === 0x2a) {
      continue;
    }

    fields.forEach(function(field) {
      var raw = trimBinaryText(buffer.slice(fieldOffset, fieldOffset + field.length).toString('latin1'));
      record[field.name] = raw;
      fieldOffset += field.length;
    });

    rows.push(record);
  }

  return rows;
}

function readMunicipalityBoundaryZip(filePath) {
  var entries = readZipEntries(fs.readFileSync(filePath));
  var dbfNames = Object.keys(entries).filter(function(fileName) {
    return /\.dbf$/i.test(fileName);
  });
  var selected = dbfNames.filter(function(fileName) {
    return path.basename(fileName).toLowerCase() === 'municipios.dbf';
  });

  if (selected.length === 0 && dbfNames.length === 1) {
    selected = dbfNames;
  }

  if (dbfNames.length === 0) {
    throw new Error('official municipality boundary ZIP does not include a DBF attribute table');
  }

  if (selected.length !== 1) {
    throw new Error('official municipality boundary ZIP must include one municipios.dbf attribute table');
  }

  return readDbfRows(entries[selected[0]]);
}

function readMunicipalityCacheRows(filePath) {
  var extension = path.extname(filePath).toLowerCase();
  var parsed;

  if (extension === '.csv') {
    return readCsvFile(filePath);
  }

  if (extension === '.json') {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.features)) {
      return parsed.features.map(function(row) {
        return row.attributes || row.properties || row;
      });
    }
  }

  if (extension === '.zip') {
    return readMunicipalityBoundaryZip(filePath);
  }

  throw new Error('official municipality boundaries must be a ZIP, extracted CSV, or extracted JSON attribute table');
}

function readCoordinateJsonFile(filePath) {
  var parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  var rows = Array.isArray(parsed) ? parsed : parsed.features || [];

  return rows.map(function(row) {
    return row.attributes || row;
  });
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function emptyFixtures() {
  return {
    cbps: [],
    muns: [],
    unis: [],
    unisCoordinates: []
  };
}

function readCsvFixtures(args) {
  var paths = {
    cbps: readArg(args, 'cbps-csv', null),
    muns: readArg(args, 'muns-csv', null),
    unis: readArg(args, 'unis-csv', null),
    unisCoordinates: readArg(args, 'unis-coordinates-csv', null)
  };

  if (!paths.cbps && !paths.muns && !paths.unis && !paths.unisCoordinates) {
    return null;
  }

  return {
    cbps: paths.cbps ? readCsvFile(paths.cbps) : [],
    muns: paths.muns ? readCsvFile(paths.muns) : [],
    unis: paths.unis ? readCsvFile(paths.unis) : [],
    unisCoordinates: paths.unisCoordinates ? readCsvFile(paths.unisCoordinates) : []
  };
}

function metadataFiles(cacheDir) {
  if (!cacheDir || !fs.existsSync(cacheDir)) {
    return [];
  }

  return fs.readdirSync(cacheDir).filter(function(fileName) {
    return fileName.indexOf('.metadata.json') !== -1;
  }).map(function(fileName) {
    return path.join(cacheDir, fileName);
  });
}

function absoluteCacheDataPath(cacheDir, metadata) {
  if (path.isAbsolute(metadata.dataPath)) {
    return metadata.dataPath;
  }

  return path.join(cacheDir, path.basename(metadata.dataPath));
}

function readCacheFixtures(cacheDir) {
  var fixtures = emptyFixtures();
  var unsupported = [];
  var errors = [];

  metadataFiles(cacheDir).forEach(function(metadataFile) {
    var metadata = readJsonFile(metadataFile);
    var key = CACHE_SOURCE_KEYS[metadata.id];
    var dataPath = absoluteCacheDataPath(cacheDir, metadata);

    if (!key) {
      unsupported.push(metadata.id);
      return;
    }

    try {
      if (key === 'unisCoordinates') {
        fixtures[key] = readCoordinateJsonFile(dataPath);
      } else if (metadata.id === 'datospr-official-municipality-boundaries') {
        fixtures[key] = readMunicipalityCacheRows(dataPath);
      } else {
        fixtures[key] = readCsvFile(dataPath);
      }
    } catch (error) {
      unsupported.push(metadata.id);
      errors.push({
        sourceId: metadata.id,
        reason: error.message
      });
    }
  });

  fixtures.unsupportedCacheSources = unsupported;
  fixtures.unsupportedCacheSourceErrors = errors;
  return fixtures;
}

function run(args) {
  var fixturePath = readArg(args, 'fixtures', null);
  var outPath = readArg(args, 'out', null);
  var cacheDir = readArg(args, 'cache-dir', null);
  var csvFixtures;
  var fixtures;
  var plan;

  try {
    csvFixtures = readCsvFixtures(args);
  } catch (error) {
    console.error('Failed to read fixture CSV: ' + error.message);
    return 1;
  }

  if (!fixturePath && !csvFixtures && !cacheDir) {
    console.error('Missing fixture input. Use --fixtures=<path>, CSV fixture arguments, or --cache-dir=<path>');
    return 1;
  }

  try {
    fixtures = csvFixtures || (cacheDir ? readCacheFixtures(cacheDir) : readJsonFile(fixturePath));
  } catch (error) {
    console.error('Failed to read planning input: ' + error.message);
    return 1;
  }

  plan = planFixtureRows(fixtures);

  try {
    if (outPath) {
      writeJsonFile(outPath, plan);
    } else {
      process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write planning report: ' + error.message);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  CACHE_SOURCE_KEYS: CACHE_SOURCE_KEYS,
  readCacheFixtures: readCacheFixtures,
  readCoordinateJsonFile: readCoordinateJsonFile,
  readDbfRows: readDbfRows,
  readMunicipalityCacheRows: readMunicipalityCacheRows,
  readMunicipalityBoundaryZip: readMunicipalityBoundaryZip,
  readZipEntries: readZipEntries,
  parseCsv: parseCsv,
  planCbpRows: planCbpRows,
  planMunicipalityRows: planMunicipalityRows,
  planUniversityRows: planUniversityRows,
  planFixtureRows: planFixtureRows,
  rowsFromCsv: rowsFromCsv,
  run: run
};
