'use strict';

var normalization = require('./data_normalization');

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

module.exports = {
  planCbpRows: planCbpRows,
  planMunicipalityRows: planMunicipalityRows,
  planUniversityRows: planUniversityRows,
  planFixtureRows: planFixtureRows
};
