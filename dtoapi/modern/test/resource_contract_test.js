'use strict';

const assert = require('assert');
const resourceContract = require('../lib/resource_contract');

assert.deepStrictEqual(resourceContract.names(), [
  'unis',
  'muns',
  'cdepts',
  'cbps',
  'busines',
  'grace_cs'
]);

assert.strictEqual(resourceContract.get('missing'), null);
assert.strictEqual(
  resourceContract.selectById(resourceContract.get('unis')),
  'SELECT id, title, address, "desc", lat, "long", created_at, updated_at FROM unis WHERE id = $1 LIMIT 1'
);
assert.strictEqual(
  resourceContract.selectById(resourceContract.get('busines')),
  'SELECT id, cdepts_id, lat, "long", title, address, created_at, updated_at FROM businesses WHERE id = $1 LIMIT 1'
);
assert.strictEqual(
  resourceContract.selectAll(resourceContract.get('unis')),
  'SELECT id, title, address, "desc", lat, "long", created_at, updated_at FROM unis ORDER BY id'
);

assert.deepStrictEqual(resourceContract.serialize({
  id: 1,
  title: 'Contract University',
  ignored: 'not public'
}, resourceContract.get('unis')), {
  id: 1,
  title: 'Contract University',
  address: undefined,
  desc: undefined,
  lat: undefined,
  long: undefined,
  created_at: undefined,
  updated_at: undefined
});
