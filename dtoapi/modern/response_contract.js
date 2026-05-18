'use strict';

function meta(count, error) {
  return {
    total: count,
    count: count,
    offset: 0,
    error: error || null
  };
}

function payload(data, error) {
  const records = data || [];

  return {
    meta: meta(records.length, error),
    data: records
  };
}

function errorPayload(message) {
  return payload([], message);
}

function serialize(body) {
  return JSON.stringify(body, null, 2);
}

module.exports = {
  errorPayload: errorPayload,
  meta: meta,
  payload: payload,
  serialize: serialize
};
