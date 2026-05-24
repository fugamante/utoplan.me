'use strict';

const assert = require('assert');
const rateLimit = require('../lib/anonymous_rate_limit');

rateLimit.resetRateLimits();

assert.strictEqual(rateLimit.rateLimitKey({
  scope: 'anonymous_session_creation',
  ip: '203.0.113.10',
  origin: 'https://APP.example'
}), 'anonymous:pre:anonymous_session_creation:ip=203.0.113.10:origin=https://app.example');

assert.strictEqual(rateLimit.rateLimitKey({
  scope: 'profile_write',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  sessionPublicId: 'anon_session_1'
}), 'anonymous:session:profile_write:session=anon_session_1');

assert.strictEqual(rateLimit.rateLimitKey({
  scope: 'csrf_failure',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  failureType: 'missing-header',
  sessionPublicId: 'anon_session_1'
}), 'anonymous:failure:csrf_failure:ip=203.0.113.10:origin=https://app.example:type=missing-header:session=anon_session_1');

assert.strictEqual(rateLimit.normalizedOrigin(null), 'none');
assert.strictEqual(rateLimit.normalizedOrigin('not a url'), 'invalid');
assert.strictEqual(rateLimit.clientIpForRateLimit({
  'x-forwarded-for': '198.51.100.20, 10.0.0.10',
  'x-real-ip': '198.51.100.30'
}, '127.0.0.1', true), '198.51.100.20');
assert.strictEqual(rateLimit.clientIpForRateLimit({
  'x-forwarded-for': '198.51.100.20',
  'x-real-ip': '198.51.100.30'
}, '127.0.0.1', false), '127.0.0.1');
assert.strictEqual(rateLimit.clientIpForRateLimit({
  'x-real-ip': '198.51.100.30'
}, '127.0.0.1', true), '198.51.100.30');
assert.strictEqual(rateLimit.clientIpForRateLimit({}, undefined, false), 'unknown');

const first = rateLimit.checkRateLimit({
  scope: 'anonymous_session_creation',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  limit: 2,
  windowMs: 1000,
  nowMs: 100
});
assert.strictEqual(first.allowed, true);
assert.strictEqual(first.remaining, 1);
assert.strictEqual(first.resetAtMs, 1100);

const second = rateLimit.checkRateLimit({
  scope: 'anonymous_session_creation',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  limit: 2,
  windowMs: 1000,
  nowMs: 200
});
assert.strictEqual(second.allowed, true);
assert.strictEqual(second.remaining, 0);

const third = rateLimit.checkRateLimit({
  scope: 'anonymous_session_creation',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  limit: 2,
  windowMs: 1000,
  nowMs: 300
});
assert.strictEqual(third.allowed, false);
assert.strictEqual(third.remaining, 0);
assert.strictEqual(rateLimit.retryAfterSeconds(third, 300), 1);
assert.strictEqual(rateLimit.retryAfterSeconds({
  allowed: false,
  key: third.key,
  limit: third.limit,
  remaining: 0,
  resetAtMs: 5300
}, 300), 5);

const afterReset = rateLimit.checkRateLimit({
  scope: 'anonymous_session_creation',
  ip: '203.0.113.10',
  origin: 'https://app.example',
  limit: 2,
  windowMs: 1000,
  nowMs: 1200
});
assert.strictEqual(afterReset.allowed, true);
assert.strictEqual(afterReset.remaining, 1);

rateLimit.resetRateLimits();
assert.strictEqual(rateLimit.checkRateLimit({
  scope: 'profile_delete',
  ip: '203.0.113.10',
  sessionPublicId: 'anon_session_1',
  limit: 1
}).allowed, true);
