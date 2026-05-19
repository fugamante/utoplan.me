'use strict';

const assert = require('assert');
const rootContract = require('../lib/root_contract');

assert.deepStrictEqual(rootContract.ROOT_DATA, [
  {message: 'Welcome to your Nodal Project'}
]);

assert.deepStrictEqual(rootContract.rootPayload(), {
  meta: {
    total: 1,
    count: 1,
    offset: 0,
    error: null
  },
  data: [
    {message: 'Welcome to your Nodal Project'}
  ]
});

assert.strictEqual(
  rootContract.serializeRootPayload(),
  '{\n  "meta": {\n    "total": 1,\n    "count": 1,\n    "offset": 0,\n    "error": null\n  },\n  "data": [\n    {\n      "message": "Welcome to your Nodal Project"\n    }\n  ]\n}'
);
