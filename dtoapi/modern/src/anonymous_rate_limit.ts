'use strict';

import {type IncomingHttpHeaders} from 'http';

export const DEFAULT_LIMIT = 60;
export const DEFAULT_WINDOW_MS = 60 * 1000;

export type RateLimitScope = 'anonymous_session_creation' | 'profile_read' | 'profile_write' | 'profile_delete' | 'origin_failure' | 'csrf_failure' | 'token_failure';

export interface RateLimitInput {
  scope: RateLimitScope;
  ip: string;
  origin?: string | null;
  sessionPublicId?: string | null;
  failureType?: string | null;
  limit?: number;
  windowMs?: number;
  nowMs?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAtMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAtMs: number;
}

const buckets: Record<string, RateLimitBucket> = {};

function firstHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function firstForwardedIp(value: string | string[] | undefined): string {
  return firstHeaderValue(value).split(',').map(function(part) {
    return part.trim();
  }).filter(function(part) {
    return part !== '';
  })[0] || '';
}

export function normalizedOrigin(origin: string | null | undefined): string {
  if (!origin) {
    return 'none';
  }

  try {
    return new URL(origin).origin.toLowerCase();
  } catch (error) {
    return 'invalid';
  }
}

function normalizePart(value: string | null | undefined): string {
  return String(value || 'none').trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '_') || 'none';
}

export function clientIpForRateLimit(headers: IncomingHttpHeaders, remoteAddress: string | undefined, trustedProxy: boolean): string {
  if (trustedProxy) {
    const forwardedIp = firstForwardedIp(headers['x-forwarded-for']);

    if (forwardedIp) {
      return forwardedIp;
    }

    const realIp = firstHeaderValue(headers['x-real-ip']).trim();

    if (realIp) {
      return realIp;
    }
  }

  return remoteAddress || 'unknown';
}

export function retryAfterSeconds(decision: RateLimitDecision, nowMs?: number): number {
  const currentMs = nowMs === undefined ? Date.now() : nowMs;
  const remainingMs = Math.max(0, decision.resetAtMs - currentMs);

  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export function preAuthRateLimitKey(input: RateLimitInput): string {
  const scope = normalizePart(input.scope);
  const ip = normalizePart(input.ip);
  const origin = normalizedOrigin(input.origin);

  return ['anonymous', 'pre', scope, 'ip=' + ip, 'origin=' + origin].join(':');
}

export function sessionRateLimitKey(input: RateLimitInput): string | null {
  const scope = normalizePart(input.scope);
  const session = normalizePart(input.sessionPublicId);

  if (!input.sessionPublicId) {
    return null;
  }

  return ['anonymous', 'session', scope, 'session=' + session].join(':');
}

export function failureRateLimitKey(input: RateLimitInput): string {
  const scope = normalizePart(input.scope);
  const ip = normalizePart(input.ip);
  const origin = normalizedOrigin(input.origin);
  const failureType = normalizePart(input.failureType);
  const session = normalizePart(input.sessionPublicId);

  return ['anonymous', 'failure', scope, 'ip=' + ip, 'origin=' + origin, 'type=' + failureType, 'session=' + session].join(':');
}

export function rateLimitKey(input: RateLimitInput): string {
  if (input.scope === 'anonymous_session_creation') {
    return preAuthRateLimitKey(input);
  }

  if (input.scope === 'origin_failure' || input.scope === 'csrf_failure' || input.scope === 'token_failure') {
    return failureRateLimitKey(input);
  }

  if (input.sessionPublicId) {
    return sessionRateLimitKey(input) as string;
  }

  return preAuthRateLimitKey(input);
}

export const checkAnonymousRateLimit = checkRateLimit;
export const resetAnonymousRateLimits = resetRateLimits;

export function checkRateLimit(input: RateLimitInput): RateLimitDecision {
  const key = rateLimitKey(input);
  const limit = input.limit || DEFAULT_LIMIT;
  const windowMs = input.windowMs || DEFAULT_WINDOW_MS;
  const nowMs = input.nowMs || Date.now();
  let bucket = buckets[key];

  if (!bucket || bucket.resetAtMs <= nowMs) {
    bucket = {
      count: 0,
      resetAtMs: nowMs + windowMs
    };
    buckets[key] = bucket;
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      key: key,
      limit: limit,
      remaining: 0,
      resetAtMs: bucket.resetAtMs
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    key: key,
    limit: limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAtMs: bucket.resetAtMs
  };
}

export function resetRateLimits(): void {
  Object.keys(buckets).forEach(function(key) {
    delete buckets[key];
  });
}
