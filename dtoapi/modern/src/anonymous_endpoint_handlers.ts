'use strict';

import {type IncomingHttpHeaders, type OutgoingHttpHeaders} from 'http';
import * as anonymousProfile from './anonymous_profile';
import * as anonymousRateLimit from './anonymous_rate_limit';
import * as anonymousSecurity from './anonymous_security';
import * as profileValidation from './anonymous_profile_validation';
import * as responseContract from './response_contract';

export interface AnonymousEndpointRequest {
  headers: IncomingHttpHeaders;
  remoteAddress?: string;
  body: string;
  now: Date;
}

export interface AnonymousEndpointResult {
  statusCode: number;
  headers: OutgoingHttpHeaders;
  body: string;
}

export interface AnonymousEndpointDependencies {
  allowedOrigins: string[];
  trustedProxy?: boolean;
  createSecret(): anonymousSecurity.TokenPair;
  createPublicId(): string;
  checkRateLimit(input: anonymousRateLimit.RateLimitInput): anonymousRateLimit.RateLimitDecision;
  createSession(input: anonymousProfile.CreateAnonymousSessionInput, callback: anonymousProfile.AnonymousProfileCallback): void;
  findSessionByTokenHash(tokenHash: Buffer, callback: anonymousProfile.AnonymousSessionCallback): void;
  findProfile(anonymousSessionId: number, callback: anonymousProfile.AnonymousProfileCallback): void;
  updateProfile(input: anonymousProfile.UpdateProfileInput, callback: anonymousProfile.AnonymousProfileCallback): void;
  deleteProfileAndRevoke(input: anonymousProfile.DeleteProfileInput, callback: anonymousProfile.DeletedAnonymousProfileCallback): void;
}

export type AnonymousEndpointCallback = (error: Error | null, result?: AnonymousEndpointResult) => void;

export interface AnonymousAuthenticatedSession {
  session: anonymousProfile.AnonymousSessionRow;
}

export interface AnonymousAuthResult {
  ok: boolean;
  auth: AnonymousAuthenticatedSession | null;
  result: AnonymousEndpointResult | null;
}

export type AnonymousAuthCallback = (error: Error | null, authResult?: AnonymousAuthResult) => void;

const DEFAULT_ANONYMOUS_ALLOWED_ORIGINS = [
  'http://127.0.0.1:18083',
  'http://localhost:18083'
];

function jsonHeaders(extraHeaders?: OutgoingHttpHeaders): OutgoingHttpHeaders {
  return Object.assign({}, extraHeaders || {}, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'utoplan-modern-api'
  });
}

function response(statusCode: number, body: unknown, extraHeaders?: OutgoingHttpHeaders): AnonymousEndpointResult {
  return {
    statusCode: statusCode,
    headers: jsonHeaders(extraHeaders),
    body: responseContract.serialize(body)
  };
}

function errorResult(statusCode: number, error: string, extraHeaders?: OutgoingHttpHeaders): AnonymousEndpointResult {
  return response(statusCode, responseContract.errorPayload(error), extraHeaders);
}

function validationErrorResult(validation: profileValidation.ProfileValidationResult): AnonymousEndpointResult {
  const error = validation.error === 'invalid_request' ? 'invalid_request' :
    (validation.error === 'profile_too_large' ? 'profile_too_large' : 'invalid_profile');

  return errorResult(validation.statusCode, error);
}

function rateLimitInput(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, scope: anonymousRateLimit.RateLimitScope, sessionPublicId?: string): anonymousRateLimit.RateLimitInput {
  return {
    scope: scope,
    ip: anonymousRateLimit.clientIpForRateLimit(request.headers, request.remoteAddress, deps.trustedProxy === true),
    origin: typeof request.headers.origin === 'string' ? request.headers.origin : null,
    sessionPublicId: sessionPublicId || null
  };
}

function rateLimitedResult(decision: anonymousRateLimit.RateLimitDecision, nowMs: number): AnonymousEndpointResult | null {
  if (decision.allowed) {
    return null;
  }

  return errorResult(429, 'Too Many Requests', anonymousRateLimit.anonymousRateLimitHeaders(decision, nowMs));
}

function hasSameOriginSignal(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies): boolean {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '';
  const referer = typeof request.headers.referer === 'string' ? request.headers.referer : '';
  const allowedOrigins = deps.allowedOrigins.length > 0 ? deps.allowedOrigins : DEFAULT_ANONYMOUS_ALLOWED_ORIGINS;

  if (origin) {
    return allowedOrigins.indexOf(origin) !== -1;
  }

  if (referer) {
    try {
      return allowedOrigins.indexOf(new URL(referer).origin) !== -1;
    } catch (error) {
      return false;
    }
  }

  return false;
}

function verifyCsrf(request: AnonymousEndpointRequest, session: anonymousProfile.AnonymousSessionRow): AnonymousEndpointResult | null {
  if (!anonymousSecurity.verifyCsrfToken(request.headers['x-csrf-token'], session.csrfTokenHash)) {
    return errorResult(403, 'Forbidden');
  }

  return null;
}

export function authenticateAnonymousSession(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, callback: AnonymousAuthCallback): void {
  const token = anonymousSecurity.readAnonymousSessionCookie(request.headers.cookie);

  if (!token) {
    callback(null, {
      ok: false,
      auth: null,
      result: errorResult(401, 'Unauthorized')
    });
    return;
  }

  deps.findSessionByTokenHash(anonymousSecurity.hashToken(token), function(error, session) {
    if (error) {
      callback(error);
      return;
    }

    if (!session) {
      callback(null, {
        ok: false,
        auth: null,
        result: errorResult(401, 'Unauthorized')
      });
      return;
    }

    callback(null, {
      ok: true,
      auth: {
        session: session
      },
      result: null
    });
  });
}

export function handleCreateAnonymousSession(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, callback: AnonymousEndpointCallback): void {
  const decision = deps.checkRateLimit(rateLimitInput(request, deps, 'anonymous_session_creation'));
  const limited = rateLimitedResult(decision, request.now.getTime());

  if (limited) {
    callback(null, limited);
    return;
  }

  const validation = profileValidation.validateAnonymousSessionCreateBody(request.body);

  if (!validation.ok || !validation.profile) {
    callback(null, validationErrorResult(validation));
    return;
  }

  const sessionSecret = deps.createSecret();
  const csrfSecret = deps.createSecret();
  const publicId = deps.createPublicId();
  const expiresAt = new Date(request.now.getTime() + anonymousSecurity.SESSION_TTL_HOURS * 60 * 60 * 1000);

  deps.createSession({
    publicId: publicId,
    tokenHash: sessionSecret.hash,
    csrfTokenHash: csrfSecret.hash,
    expiresAt: expiresAt,
    profile: validation.profile
  }, function(error, profile) {
    if (error) {
      callback(error);
      return;
    }

    if (!profile) {
      callback(null, errorResult(500, 'Internal Server Error'));
      return;
    }

    callback(null, response(201, {
      meta: responseContract.meta(1),
      data: [{
        session: {
          publicId: publicId
        },
        profile: anonymousProfile.profileEnvelope(profile),
        csrfToken: csrfSecret.raw
      }]
    }, {
      'Set-Cookie': anonymousSecurity.sessionCookie(sessionSecret.raw, {
        now: request.now
      })
    }));
  });
}

export function handleReadAnonymousProfile(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, callback: AnonymousEndpointCallback): void {
  authenticateAnonymousSession(request, deps, function(error, authResult) {
    if (error) {
      callback(error);
      return;
    }

    if (!authResult) {
      callback(null, errorResult(500, 'Internal Server Error'));
      return;
    }

    if (!authResult.ok || !authResult.auth) {
      callback(null, authResult.result || errorResult(401, 'Unauthorized'));
      return;
    }

    const decision = deps.checkRateLimit(rateLimitInput(request, deps, 'profile_read', authResult.auth.session.publicId));
    const limited = rateLimitedResult(decision, request.now.getTime());

    if (limited) {
      callback(null, limited);
      return;
    }

    deps.findProfile(authResult.auth.session.id, function(profileError, profile) {
      if (profileError) {
        callback(profileError);
        return;
      }

      if (!profile) {
        callback(null, errorResult(404, 'Not Found'));
        return;
      }

      callback(null, response(200, responseContract.payload([anonymousProfile.profileEnvelope(profile)])));
    });
  });
}

export function handleUpdateAnonymousProfile(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, callback: AnonymousEndpointCallback): void {
  if (!hasSameOriginSignal(request, deps)) {
    callback(null, errorResult(403, 'Forbidden'));
    return;
  }

  authenticateAnonymousSession(request, deps, function(error, authResult) {
    if (error) {
      callback(error);
      return;
    }

    if (!authResult || !authResult.ok || !authResult.auth) {
      callback(null, authResult && authResult.result ? authResult.result : errorResult(401, 'Unauthorized'));
      return;
    }

    const csrfResult = verifyCsrf(request, authResult.auth.session);

    if (csrfResult) {
      callback(null, csrfResult);
      return;
    }

    const decision = deps.checkRateLimit(rateLimitInput(request, deps, 'profile_write', authResult.auth.session.publicId));
    const limited = rateLimitedResult(decision, request.now.getTime());

    if (limited) {
      callback(null, limited);
      return;
    }

    const validation = profileValidation.validateAnonymousProfilePutBody(request.body);

    if (!validation.ok || !validation.profile || !validation.rowVersion) {
      callback(null, validationErrorResult(validation));
      return;
    }

    const session = authResult.auth.session;

    deps.updateProfile({
      anonymousSessionId: session.id,
      expectedRowVersion: validation.rowVersion,
      profile: validation.profile
    }, function(updateError, profile) {
      if (updateError) {
        callback(updateError);
        return;
      }

      if (!profile) {
        deps.findProfile(session.id, function(findError, existingProfile) {
          if (findError) {
            callback(findError);
            return;
          }

          callback(null, existingProfile ? errorResult(409, 'Conflict') : errorResult(404, 'Not Found'));
        });
        return;
      }

      callback(null, response(200, responseContract.payload([anonymousProfile.profileEnvelope(profile)])));
    });
  });
}

export function handleDeleteAnonymousProfile(request: AnonymousEndpointRequest, deps: AnonymousEndpointDependencies, callback: AnonymousEndpointCallback): void {
  if (!hasSameOriginSignal(request, deps)) {
    callback(null, errorResult(403, 'Forbidden'));
    return;
  }

  authenticateAnonymousSession(request, deps, function(error, authResult) {
    if (error) {
      callback(error);
      return;
    }

    if (!authResult || !authResult.ok || !authResult.auth) {
      callback(null, authResult && authResult.result ? authResult.result : errorResult(401, 'Unauthorized'));
      return;
    }

    const csrfResult = verifyCsrf(request, authResult.auth.session);

    if (csrfResult) {
      callback(null, csrfResult);
      return;
    }

    const decision = deps.checkRateLimit(rateLimitInput(request, deps, 'profile_delete', authResult.auth.session.publicId));
    const limited = rateLimitedResult(decision, request.now.getTime());

    if (limited) {
      callback(null, limited);
      return;
    }

    deps.deleteProfileAndRevoke({
      anonymousSessionId: authResult.auth.session.id,
      revokeReason: 'profile_deleted'
    }, function(deleteError, deleted) {
      if (deleteError) {
        callback(deleteError);
        return;
      }

      if (!deleted) {
        callback(null, errorResult(500, 'Internal Server Error'));
        return;
      }

      if (!deleted.session) {
        callback(null, errorResult(500, 'Internal Server Error'));
        return;
      }

      if (!deleted.profile) {
        callback(null, errorResult(410, 'Gone'));
        return;
      }

      callback(null, {
        statusCode: 204,
        headers: jsonHeaders({
          'Set-Cookie': anonymousSecurity.clearSessionCookie()
        }),
        body: ''
      });
    });
  });
}
