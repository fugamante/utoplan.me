'use strict';

const db = require('./db');
const resourceContract = require('./lib/resource_contract');
const responseContract = require('./lib/response_contract');

function payload(row, resource) {
  const data = row ? [resourceContract.serialize(row, resource)] : [];

  return responseContract.payload(data);
}

function find(kind, id, callback) {
  const resource = resourceContract.get(kind);

  if (!resource) {
    return callback(null, null, null);
  }

  db.query(resourceContract.selectById(resource), [id], function(error, result) {
    if (error) {
      return callback(error);
    }

    callback(null, result.rows[0] || null, resource);
  });
}

module.exports = {
  find: find,
  payload: payload
};
