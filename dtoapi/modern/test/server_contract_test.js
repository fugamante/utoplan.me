'use strict';

const assert = require('assert');
const modernApi = require('../lib/server');

const uniMatch = modernApi.matchRecord('/v1/unis/123');
assert(uniMatch);
assert.strictEqual(uniMatch[1], 'unis');
assert.strictEqual(uniMatch[2], '123');

assert.strictEqual(modernApi.matchRecord('/v1/unis/not-a-number'), null);
assert.strictEqual(modernApi.matchRecord('/v1/unknown/1'), null);

assert.strictEqual(modernApi.acceptsGzip({
  headers: {
    'accept-encoding': 'br, gzip'
  }
}), true);

assert.strictEqual(modernApi.acceptsGzip({
  headers: {
    'accept-encoding': 'br'
  }
}), false);

assert.strictEqual(typeof modernApi.createServer().listen, 'function');
