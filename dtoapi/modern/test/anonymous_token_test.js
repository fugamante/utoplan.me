'use strict';

const assert = require('assert');
const anonymousSecurity = require('../lib/anonymous_security');

const token = anonymousSecurity.generateToken();
assert.strictEqual(typeof token, 'string');
assert(token.length >= 43);
assert(!token.includes('+'));
assert(!token.includes('/'));
assert(!token.includes('='));
assert.notStrictEqual(anonymousSecurity.generateOpaqueToken(), anonymousSecurity.generateOpaqueToken());

assert.throws(function() {
  anonymousSecurity.generateToken(15);
}, /at least 128 bits/);

const hash = anonymousSecurity.hashToken(token);
assert(Buffer.isBuffer(hash));
assert.strictEqual(hash.length, 32);
assert.notStrictEqual(hash.toString('hex'), token);
assert.strictEqual(anonymousSecurity.tokenHashEquals(hash, token), true);
assert.strictEqual(anonymousSecurity.tokenHashEquals(hash, token + 'x'), false);
assert.strictEqual(anonymousSecurity.tokenHashEquals(hash, ''), false);
assert.strictEqual(anonymousSecurity.tokenHashEquals(Buffer.from('bad'), token), false);
assert.strictEqual(anonymousSecurity.timingSafeTokenHashEquals(token, hash), true);

const pair = anonymousSecurity.generateTokenPair();
assert.strictEqual(typeof pair.raw, 'string');
assert(Buffer.isBuffer(pair.hash));
assert.strictEqual(anonymousSecurity.tokenHashEquals(pair.hash, pair.raw), true);

const secret = anonymousSecurity.createAnonymousSecret();
assert.strictEqual(anonymousSecurity.tokenHashEquals(secret.hash, secret.raw), true);
assert.strictEqual(anonymousSecurity.verifyCsrfToken(secret.raw, secret.hash), true);
assert.strictEqual(anonymousSecurity.verifyCsrfToken([secret.raw], secret.hash), false);
assert.strictEqual(anonymousSecurity.verifyCsrfToken(undefined, secret.hash), false);
assert.strictEqual(anonymousSecurity.verifyCsrfToken(pair.raw, secret.hash), false);

assert.deepStrictEqual(anonymousSecurity.parseCookieHeader('a=1; utoplan_anon_session=abc123; theme=light'), {
  a: '1',
  utoplan_anon_session: 'abc123',
  theme: 'light'
});
assert.strictEqual(anonymousSecurity.readAnonymousSessionCookie('a=1; utoplan_anon_session=abc123'), 'abc123');
assert.strictEqual(anonymousSecurity.readAnonymousSessionCookie('a=1'), null);

const cookie = anonymousSecurity.sessionCookie('abc123', {
  maxAgeHours: 24,
  now: new Date('2026-05-24T00:00:00Z')
});
assert(cookie.indexOf('utoplan_anon_session=abc123') === 0);
assert(cookie.indexOf('Max-Age=86400') !== -1);
assert(cookie.indexOf('Expires=Mon, 25 May 2026 00:00:00 GMT') !== -1);
assert(cookie.indexOf('Path=/') !== -1);
assert(cookie.indexOf('HttpOnly') !== -1);
assert(cookie.indexOf('Secure') !== -1);
assert(cookie.indexOf('SameSite=Lax') !== -1);
assert(cookie.indexOf('Domain=') === -1);
assert.throws(function() {
  anonymousSecurity.sessionCookie('abc; Path=/bad');
}, /base64url safe/);

const clearCookie = anonymousSecurity.clearSessionCookie();
assert(clearCookie.indexOf('utoplan_anon_session=') === 0);
assert(clearCookie.indexOf('Max-Age=0') !== -1);
assert(clearCookie.indexOf('Expires=Thu, 01 Jan 1970 00:00:00 GMT') !== -1);
assert(clearCookie.indexOf('HttpOnly') !== -1);
assert(clearCookie.indexOf('Secure') !== -1);
assert(clearCookie.indexOf('SameSite=Lax') !== -1);
assert.strictEqual(anonymousSecurity.buildClearAnonymousSessionCookie(), clearCookie);
