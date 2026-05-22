'use strict';

const assert = require('assert');
const records = require('../lib/records');
const resourceContract = require('../lib/resource_contract');

const uni = resourceContract.get('unis');
const payload = records.payload({
  id: 1,
  title: 'Contract University',
  address: '100 Contract Ave',
  desc: 'Seeded university row',
  lat: 18.42,
  long: -66.06,
  ignored: 'not public'
}, uni);

assert.deepStrictEqual(payload, {
  meta: {
    total: 1,
    count: 1,
    offset: 0,
    error: null
  },
  data: [{
    id: 1,
    title: 'Contract University',
    address: '100 Contract Ave',
    desc: 'Seeded university row',
    lat: 18.42,
    long: -66.06,
    created_at: undefined,
    updated_at: undefined
  }]
});

assert.deepStrictEqual(records.payload(null, uni), {
  meta: {
    total: 0,
    count: 0,
    offset: 0,
    error: null
  },
  data: []
});

assert.deepStrictEqual(records.collectionPayload([{
  id: 1,
  title: 'Contract University',
  address: '100 Contract Ave',
  desc: 'Seeded university row',
  lat: 18.42,
  long: -66.06,
  ignored: 'not public'
}], uni), payload);
