'use strict';

const db = require('./db');
const responseContract = require('./response_contract');

const resources = {
  unis: {
    table: 'unis',
    columns: ['id', 'title', 'address', 'desc', 'lat', 'long', 'created_at', 'updated_at']
  },
  muns: {
    table: 'muns',
    columns: ['id', 'title', 'county', 'created_at', 'updated_at']
  },
  cdepts: {
    table: 'cdepts',
    columns: ['id', 'cnaic', 'created_at', 'updated_at']
  },
  cbps: {
    table: 'cbps',
    columns: ['id', 'total_indus', 'total_anual', 'cnaic', 'cnaic_name', 'county', 'num_est', 'created_at', 'updated_at']
  },
  busines: {
    table: 'businesses',
    columns: ['id', 'cdepts_id', 'lat', 'long', 'title', 'address', 'created_at', 'updated_at']
  },
  grace_cs: {
    table: 'grade_cs',
    columns: ['id', 'uni_id', 'cdepts_id', 'rate', 'year', 'created_at', 'updated_at']
  }
};

function quoteColumn(column) {
  return column === 'desc' || column === 'long' ? '"' + column + '"' : column;
}

function serialize(row, columns) {
  return columns.reduce(function(record, column) {
    record[column] = row[column];
    return record;
  }, {});
}

function payload(row, resource) {
  const data = row ? [serialize(row, resource.columns)] : [];

  return responseContract.payload(data);
}

function find(kind, id, callback) {
  const resource = resources[kind];

  if (!resource) {
    return callback(null, null, null);
  }

  const columns = resource.columns.map(quoteColumn).join(', ');
  const query = 'SELECT ' + columns + ' FROM ' + resource.table + ' WHERE id = $1 LIMIT 1';

  db.query(query, [id], function(error, result) {
    if (error) {
      return callback(error);
    }

    callback(null, result.rows[0] || null, resource);
  });
}

module.exports = {
  find: find,
  payload: payload,
  resources: resources
};
