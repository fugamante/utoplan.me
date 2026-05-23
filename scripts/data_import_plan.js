'use strict';

var fs = require('fs');
var normalization = require('./data_normalization');

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
    row['Principal Ejecutivo'],
    row.Telefono,
    row['Dirección Pág Web'],
    row['Correo Electrónico']
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
  return combinePlans([
    planCbpRows(fixtures.cbps || []),
    planMunicipalityRows(fixtures.muns || []),
    planUniversityRows(fixtures.unis || [], fixtures.unisCoordinates || [])
  ]);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function run(args) {
  var fixturePath = readArg(args, 'fixtures', null);
  var outPath = readArg(args, 'out', null);
  var fixtures;
  var plan;

  if (!fixturePath) {
    console.error('Missing required --fixtures=<path> argument');
    return 1;
  }

  try {
    fixtures = readJsonFile(fixturePath);
  } catch (error) {
    console.error('Failed to read fixture JSON: ' + error.message);
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
  planCbpRows: planCbpRows,
  planMunicipalityRows: planMunicipalityRows,
  planUniversityRows: planUniversityRows,
  planFixtureRows: planFixtureRows,
  run: run
};
