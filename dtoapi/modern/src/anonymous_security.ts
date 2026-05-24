'use strict';

import crypto from 'crypto';

export const TOKEN_BYTES = 32;
export const TOKEN_HASH_ALGORITHM = 'sha256';
export const SESSION_COOKIE_NAME = 'utoplan_anon_session';
export const SESSION_COOKIE_PATH = '/';
export const SESSION_TTL_HOURS = 24;

export interface TokenPair {
  raw: string;
  hash: Buffer;
}

export interface SessionCookieOptions {
  maxAgeHours?: number;
  now?: Date;
}

export function generateOpaqueToken(bytes?: number): string {
  return generateToken(bytes);
}

export function generateToken(bytes: number = TOKEN_BYTES): string {
  if (!Number.isInteger(bytes) || bytes < 16) {
    throw new Error('token entropy must be at least 128 bits');
  }

  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): Buffer {
  if (!token) {
    throw new Error('token is required');
  }

  return crypto.createHash(TOKEN_HASH_ALGORITHM).update(token, 'utf8').digest();
}

export function generateTokenPair(): TokenPair {
  const raw = generateToken();

  return {
    raw: raw,
    hash: hashToken(raw)
  };
}

export function createAnonymousSecret(): TokenPair {
  return generateTokenPair();
}

export function tokenHashEquals(expected: Buffer, candidate: string | null | undefined): boolean {
  let actual: Buffer;

  if (!candidate || !Buffer.isBuffer(expected)) {
    return false;
  }

  try {
    actual = hashToken(candidate);
  } catch (error) {
    return false;
  }

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

export function timingSafeTokenHashEquals(presentedToken: string | null | undefined, storedHash: Buffer): boolean {
  return tokenHashEquals(storedHash, presentedToken);
}

export function verifyCsrfToken(presentedToken: string | string[] | undefined, storedHash: Buffer): boolean {
  if (typeof presentedToken !== 'string') {
    return false;
  }

  return tokenHashEquals(storedHash, presentedToken);
}

export function parseCookieHeader(header: string | string[] | undefined): Record<string, string> {
  const value = Array.isArray(header) ? header.join(';') : header;
  const cookies: Record<string, string> = {};

  if (!value) {
    return cookies;
  }

  value.split(';').forEach(function(part) {
    const index = part.indexOf('=');

    if (index === -1) {
      return;
    }

    const name = part.slice(0, index).trim();
    const cookieValue = part.slice(index + 1).trim();

    if (name) {
      cookies[name] = cookieValue;
    }
  });

  return cookies;
}

export function readAnonymousSessionCookie(header: string | string[] | undefined): string | null {
  const cookies = parseCookieHeader(header);

  return cookies[SESSION_COOKIE_NAME] || null;
}

function cookieDate(date: Date): string {
  return date.toUTCString();
}

function assertSafeCookieValue(value: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('cookie value must be base64url safe');
  }
}

export function sessionCookie(token: string, options?: SessionCookieOptions): string {
  assertSafeCookieValue(token);

  const maxAgeHours = options && options.maxAgeHours ? options.maxAgeHours : SESSION_TTL_HOURS;
  const now = options && options.now ? options.now : new Date();
  const maxAgeSeconds = maxAgeHours * 60 * 60;
  const expires = new Date(now.getTime() + maxAgeSeconds * 1000);

  return [
    SESSION_COOKIE_NAME + '=' + token,
    'Max-Age=' + String(maxAgeSeconds),
    'Expires=' + cookieDate(expires),
    'Path=' + SESSION_COOKIE_PATH,
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

export function buildAnonymousSessionCookie(token: string, expiresAt: Date): string {
  const now = new Date();
  const maxAgeHours = Math.max(0, (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000));

  return sessionCookie(token, {
    maxAgeHours: maxAgeHours,
    now: now
  });
}

export function clearSessionCookie(): string {
  return [
    SESSION_COOKIE_NAME + '=',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Path=' + SESSION_COOKIE_PATH,
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

export function buildClearAnonymousSessionCookie(): string {
  return clearSessionCookie();
}
