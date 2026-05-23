'use strict';

const assert = require('assert');
const responseContract = require('../lib/response_contract');

const data = [{id: 1, title: 'Contract University'}];
const payload = responseContract.payload(data);

assert.deepStrictEqual(payload, {
  meta: {
    total: 1,
    count: 1,
    offset: 0,
    error: null
  },
  data: data
});

assert.deepStrictEqual(responseContract.payload(data, null, 5, 2), {
  meta: {
    total: 5,
    count: 1,
    offset: 2,
    error: null
  },
  data: data
});

assert.deepStrictEqual(responseContract.errorPayload('Not Found'), {
  meta: {
    total: 0,
    count: 0,
    offset: 0,
    error: 'Not Found'
  },
  data: []
});

assert.strictEqual(
  responseContract.serialize(responseContract.errorPayload('Not Found')),
  '{\n  "meta": {\n    "total": 0,\n    "count": 0,\n    "offset": 0,\n    "error": "Not Found"\n  },\n  "data": []\n}'
);
