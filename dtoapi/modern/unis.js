'use strict';

const db = require('./db');

function serializeUni(row) {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    desc: row.desc,
    lat: row.lat,
    long: row.long,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function uniPayload(row) {
  const data = row ? [serializeUni(row)] : [];

  return {
    meta: {
      total: data.length,
      count: data.length,
      offset: 0,
      error: null
    },
    data: data
  };
}

function findUni(id, callback) {
  db.query(
    'SELECT id, title, address, "desc", lat, long, created_at, updated_at FROM unis WHERE id = $1 LIMIT 1',
    [id],
    function(error, result) {
      if (error) {
        return callback(error);
      }

      callback(null, result.rows[0] || null);
    }
  );
}

module.exports = {
  findUni: findUni,
  uniPayload: uniPayload
};
