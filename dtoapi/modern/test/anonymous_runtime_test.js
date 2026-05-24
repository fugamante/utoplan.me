'use strict';

const assert = require('assert');
const anonymousRuntime = require('../lib/anonymous_runtime');

assert.strictEqual(anonymousRuntime.anonymousRuntimeRequested({}), false);
assert.strictEqual(anonymousRuntime.anonymousRuntimeRequested({
  UTOPLAN_ANONYMOUS_RUNTIME: '1'
}), true);

assert.strictEqual(anonymousRuntime.anonymousRateLimitMode({}), 'unset');
assert.strictEqual(anonymousRuntime.anonymousRateLimitMode({
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'local'
}), 'local');
assert.strictEqual(anonymousRuntime.anonymousRateLimitMode({
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'shared'
}), 'shared');
assert.strictEqual(anonymousRuntime.anonymousRateLimitMode({
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'edge'
}), 'edge');
assert.strictEqual(anonymousRuntime.anonymousRateLimitMode({
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'redis'
}), 'unset');

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({}, false), {
  requested: false,
  enabled: false,
  rateLimitMode: 'unset',
  errors: []
});

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'local',
  UTOPLAN_TRUST_PROXY: '1'
}, true), {
  requested: true,
  enabled: false,
  rateLimitMode: 'local',
  errors: [
    'anonymous runtime requires shared or edge rate limiting'
  ]
});

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'shared'
}, true), {
  requested: true,
  enabled: false,
  rateLimitMode: 'shared',
  errors: [
    'shared anonymous rate limiting requires trusted proxy client identity'
  ]
});

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'edge'
}, false), {
  requested: true,
  enabled: false,
  rateLimitMode: 'edge',
  errors: [
    'anonymous schema readiness must be confirmed'
  ]
});

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'edge'
}, true), {
  requested: true,
  enabled: true,
  rateLimitMode: 'edge',
  errors: []
});

assert.deepStrictEqual(anonymousRuntime.anonymousRuntimeGate({
  UTOPLAN_ANONYMOUS_RUNTIME: '1',
  UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'shared',
  UTOPLAN_TRUST_PROXY: '1'
}, true), {
  requested: true,
  enabled: true,
  rateLimitMode: 'shared',
  errors: []
});
