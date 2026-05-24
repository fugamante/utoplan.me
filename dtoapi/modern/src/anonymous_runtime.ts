'use strict';

export type AnonymousRateLimitMode = 'local' | 'shared' | 'edge' | 'unset';

export interface AnonymousRuntimeGate {
  requested: boolean;
  enabled: boolean;
  rateLimitMode: AnonymousRateLimitMode;
  errors: string[];
}

type RuntimeEnv = Record<string, string | undefined>;

export function anonymousRuntimeRequested(env?: RuntimeEnv): boolean {
  const values = env || process.env;
  return values.UTOPLAN_ANONYMOUS_RUNTIME === '1';
}

export function anonymousRateLimitMode(env?: RuntimeEnv): AnonymousRateLimitMode {
  const values = env || process.env;
  const mode = values.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE;

  if (mode === 'local' || mode === 'shared' || mode === 'edge') {
    return mode;
  }

  return 'unset';
}

export function anonymousRuntimeGate(env?: RuntimeEnv, schemaReady?: boolean): AnonymousRuntimeGate {
  const values = env || process.env;
  const requested = anonymousRuntimeRequested(values);
  const rateLimitMode = anonymousRateLimitMode(values);
  const errors: string[] = [];

  if (!requested) {
    return {
      requested: false,
      enabled: false,
      rateLimitMode: rateLimitMode,
      errors: []
    };
  }

  if (schemaReady !== true) {
    errors.push('anonymous schema readiness must be confirmed');
  }

  if (rateLimitMode !== 'shared' && rateLimitMode !== 'edge') {
    errors.push('anonymous runtime requires shared or edge rate limiting');
  }

  if (rateLimitMode === 'shared' && values.UTOPLAN_TRUST_PROXY !== '1') {
    errors.push('shared anonymous rate limiting requires trusted proxy client identity');
  }

  if (rateLimitMode === 'shared' && values.UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT !== '1') {
    errors.push('shared anonymous rate limiting requires UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT=1');
  }

  if (rateLimitMode === 'edge' && values.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT !== '1') {
    errors.push('edge anonymous rate limiting requires UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT=1');
  }

  return {
    requested: true,
    enabled: errors.length === 0,
    rateLimitMode: rateLimitMode,
    errors: errors
  };
}
