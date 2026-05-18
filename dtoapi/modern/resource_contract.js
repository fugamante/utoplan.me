'use strict';

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

function get(kind) {
  return resources[kind] || null;
}

function names() {
  return Object.keys(resources);
}

function selectById(resource) {
  const columns = resource.columns.map(quoteColumn).join(', ');

  return 'SELECT ' + columns + ' FROM ' + resource.table + ' WHERE id = $1 LIMIT 1';
}

function serialize(row, resource) {
  return resource.columns.reduce(function(record, column) {
    record[column] = row[column];
    return record;
  }, {});
}

module.exports = {
  get: get,
  names: names,
  resources: resources,
  selectById: selectById,
  serialize: serialize
};
