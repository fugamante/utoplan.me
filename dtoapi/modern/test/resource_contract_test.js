'use strict';

const assert = require('assert');
const resourceContract = require('../lib/resource_contract');

assert.deepStrictEqual(resourceContract.names(), [
  'unis',
  'muns',
  'cdepts',
  'cbps',
  'businesses',
  'grade_cs'
]);

assert.deepStrictEqual(resourceContract.routeNames(), [
  'busines',
  'businesses',
  'cbps',
  'cdepts',
  'grace_cs',
  'grade_cs',
  'muns',
  'unis'
]);

assert.strictEqual(resourceContract.get('missing'), null);
assert.strictEqual(resourceContract.get('busines'), resourceContract.get('businesses'));
assert.strictEqual(resourceContract.get('grace_cs'), resourceContract.get('grade_cs'));
assert.strictEqual(
  resourceContract.selectById(resourceContract.get('unis')),
  'SELECT id, title, address, "desc", lat, "long", created_at, updated_at FROM unis WHERE id = $1 LIMIT 1'
);
assert.strictEqual(
  resourceContract.selectById(resourceContract.get('businesses')),
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
