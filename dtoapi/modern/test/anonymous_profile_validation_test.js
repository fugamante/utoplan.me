'use strict';

const assert = require('assert');
const validation = require('../lib/anonymous_profile_validation');

assert.strictEqual(validation.MAX_PROFILE_BODY_BYTES, 2048);
assert.strictEqual(validation.MAX_BUSINESS_IDEA_LENGTH, 160);
assert.deepStrictEqual(validation.ALLOWED_PROFILE_FIELDS, [
  'businessIdea',
  'selectedMunicipalityId',
  'selectedCategoryId'
]);

assert.deepStrictEqual(validation.validateProfileBody(JSON.stringify({
  businessIdea: 'Bakery',
  selectedMunicipalityId: 1,
  selectedCategoryId: 'food_services'
})), {
  ok: true,
  statusCode: 200,
  error: null,
  profile: {
    businessIdea: 'Bakery',
    selectedMunicipalityId: 1,
    selectedCategoryId: 'food_services'
  }
});

assert.strictEqual(validation.validateProfileBody('{bad').statusCode, 400);
assert.strictEqual(validation.validateProfileBody(JSON.stringify({
  extra: true
})).statusCode, 422);
assert.strictEqual(validation.validateProfileBody(JSON.stringify({
  businessIdea: 'x'.repeat(161)
})).statusCode, 422);
assert.strictEqual(validation.validateProfileBody(JSON.stringify({
  selectedMunicipalityId: 0
})).statusCode, 422);
assert.strictEqual(validation.validateProfileBody(JSON.stringify({
  selectedCategoryId: ''
})).statusCode, 422);
assert.strictEqual(validation.validateProfileBody(JSON.stringify({
  selectedCategoryId: '../bad'
})).statusCode, 422);
assert.strictEqual(validation.validateProfileBody('x'.repeat(2049)).statusCode, 413);

assert.deepStrictEqual(validation.validateAnonymousSessionCreateBody(JSON.stringify({
  profile: {
    businessIdea: 'Bakery'
  }
})), {
  ok: true,
  statusCode: 200,
  error: null,
  profile: {
    businessIdea: 'Bakery'
  }
});
assert.strictEqual(validation.validateAnonymousSessionCreateBody(JSON.stringify({
  profile: {},
  unknown: true
})).statusCode, 422);

assert.deepStrictEqual(validation.validateProfileEnvelopeBody(JSON.stringify({
  rowVersion: 2,
  profile: {
    businessIdea: 'Bookkeeping'
  }
}), true), {
  ok: true,
  statusCode: 200,
  error: null,
  profile: {
    businessIdea: 'Bookkeeping'
  },
  rowVersion: 2
});

assert.strictEqual(validation.validateProfileEnvelopeBody(JSON.stringify({
  profile: {
    businessIdea: 'Bookkeeping'
  }
}), true).statusCode, 422);

assert.strictEqual(validation.validateProfileEnvelopeBody(JSON.stringify({
  rowVersion: 1,
  profile: {
    unknown: true
  }
}), true).statusCode, 422);

assert.strictEqual(validation.validateProfileEnvelopeBody('x'.repeat(2049), true).statusCode, 413);
assert.strictEqual(validation.validateAnonymousProfilePutBody(JSON.stringify({
  rowVersion: 1,
  profile: {
    selectedCategoryId: '../bad'
  }
})).statusCode, 422);
