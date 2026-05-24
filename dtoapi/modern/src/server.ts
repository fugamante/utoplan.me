'use strict';

import http, {type IncomingMessage, type OutgoingHttpHeaders, type Server, type ServerResponse} from 'http';
import {URL} from 'url';
import zlib from 'zlib';
import * as anonymousEndpointHandlers from './anonymous_endpoint_handlers';
import * as anonymousProfile from './anonymous_profile';
import * as anonymousRateLimit from './anonymous_rate_limit';
import * as anonymousRuntime from './anonymous_runtime';
import * as anonymousSecurity from './anonymous_security';
import * as anonymousProfileValidation from './anonymous_profile_validation';
import * as db from './db';
import * as demoSession from './demo_session';
import * as records from './records';
import * as planningContext from './planning_context';
import * as resourceContract from './resource_contract';
import * as responseContract from './response_contract';
import * as rootContract from './root_contract';
import * as sourceMetadata from './source_metadata';

export const CORS_HEADERS: OutgoingHttpHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export const ANONYMOUS_SESSION_COOKIE_NAME = 'utoplan_anon_session';
export const ANONYMOUS_CSRF_HEADER = 'x-csrf-token';
export const DEFAULT_ANONYMOUS_ALLOWED_ORIGINS = [
  'http://127.0.0.1:18083',
  'http://localhost:18083'
];

export const MAX_COLLECTION_LIMIT = 1000;
export const SUPPORTED_COLLECTION_QUERY_PARAMS = ['limit', 'offset'];

export type AnonymousSchemaReadyCallback = (callback: (ready: boolean) => void) => void;

export interface ServerOptions {
  anonymousSchemaReady?: AnonymousSchemaReadyCallback;
  anonymousDependencies?: anonymousEndpointHandlers.AnonymousEndpointDependencies;
}

export function acceptsGzip(request: IncomingMessage): boolean {
  return String(request.headers['accept-encoding'] || '').indexOf('gzip') !== -1;
}

export function matchRecord(pathname: string): RegExpMatchArray | null {
  return pathname.match(new RegExp('^/v1/(' + resourceContract.routeNames().join('|') + ')/([0-9]+)$'));
}

export function matchCollection(pathname: string): RegExpMatchArray | null {
  return pathname.match(new RegExp('^/v1/(' + resourceContract.routeNames().join('|') + ')$'));
}

export function parseCollectionQuery(params: URLSearchParams): records.CollectionQuery | null {
  const limit = params.get('limit');
  const offset = params.get('offset');
  const integerPattern = /^[0-9]+$/;

  if (limit !== null && (!integerPattern.test(limit) || Number(limit) < 1 || Number(limit) > MAX_COLLECTION_LIMIT)) {
    return null;
  }

  if (offset !== null && !integerPattern.test(offset)) {
    return null;
  }

  return {
    limit: limit === null ? null : Number(limit),
    offset: offset === null ? 0 : Number(offset)
  };
}

export function isAnonymousSessionPath(pathname: string): boolean {
  return pathname === '/v1/anonymous-sessions';
}

export function isAnonymousProfilePath(pathname: string): boolean {
  return pathname === '/v1/profile';
}

export function isAnonymousReservedPath(pathname: string): boolean {
  return isAnonymousSessionPath(pathname) || isAnonymousProfilePath(pathname);
}

export function anonymousAllowedOrigins(): string[] {
  const configured = process.env.UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS;

  if (!configured) {
    return DEFAULT_ANONYMOUS_ALLOWED_ORIGINS;
  }

  return configured.split(',').map(function(origin) {
    return origin.trim();
  }).filter(function(origin) {
    return origin !== '';
  });
}

export function anonymousAllowedMethods(pathname: string): string {
  if (isAnonymousSessionPath(pathname)) {
    return 'POST, OPTIONS';
  }

  if (isAnonymousProfilePath(pathname)) {
    return 'GET, PUT, DELETE, OPTIONS';
  }

  return 'OPTIONS';
}

export function anonymousCorsHeaders(pathname: string, origin: string | undefined, allowedOrigins?: string[]): OutgoingHttpHeaders | null {
  if (!isAnonymousReservedPath(pathname)) {
    return CORS_HEADERS;
  }

  if (!origin) {
    return {
      Vary: 'Origin'
    };
  }

  const origins = allowedOrigins || anonymousAllowedOrigins();

  if (origins.indexOf(origin) === -1) {
    return null;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, X-CSRF-Token',
    'Access-Control-Allow-Methods': anonymousAllowedMethods(pathname),
    Vary: 'Origin'
  };
}

export function hasSameOriginSignal(request: IncomingMessage, allowedOrigins?: string[]): boolean {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '';
  const referer = typeof request.headers.referer === 'string' ? request.headers.referer : '';
  const origins = allowedOrigins || anonymousAllowedOrigins();

  if (origin) {
    return origins.indexOf(origin) !== -1;
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return origins.indexOf(refererOrigin) !== -1;
    } catch (error) {
      return false;
    }
  }

  return false;
}

export function hasCsrfHeader(request: IncomingMessage): boolean {
  const value = request.headers[ANONYMOUS_CSRF_HEADER];

  if (Array.isArray(value)) {
    return value.some(function(item) {
      return item.trim() !== '';
    });
  }

  return typeof value === 'string' && value.trim() !== '';
}

export function anonymousRateLimitScope(pathname: string, method: string | undefined): anonymousRateLimit.RateLimitScope | null {
  if (isAnonymousSessionPath(pathname) && method === 'POST') {
    return 'anonymous_session_creation';
  }

  if (isAnonymousProfilePath(pathname) && method === 'GET') {
    return 'profile_read';
  }

  if (isAnonymousProfilePath(pathname) && method === 'PUT') {
    return 'profile_write';
  }

  if (isAnonymousProfilePath(pathname) && method === 'DELETE') {
    return 'profile_delete';
  }

  return null;
}

function anonymousRateLimitNumber(name: string): number | undefined {
  const value = process.env[name];

  if (!value || !/^[0-9]+$/.test(value) || Number(value) < 1) {
    return undefined;
  }

  return Number(value);
}

export function anonymousRateLimitDecision(request: IncomingMessage, pathname: string): anonymousRateLimit.RateLimitDecision | null {
  const scope = anonymousRateLimitScope(pathname, request.method);

  if (!scope) {
    return null;
  }

  return anonymousRateLimit.checkAnonymousRateLimit({
    scope: scope,
    ip: anonymousRateLimit.clientIpForRateLimit(
      request.headers,
      request.socket ? request.socket.remoteAddress || undefined : undefined,
      process.env.UTOPLAN_TRUST_PROXY === '1'
    ),
    origin: typeof request.headers.origin === 'string' ? request.headers.origin : null,
    limit: anonymousRateLimitNumber('UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT'),
    windowMs: anonymousRateLimitNumber('UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS')
  });
}

function anonymousRuntimeEnabled(schemaReady: boolean): boolean {
  return anonymousRuntime.anonymousRuntimeGate(process.env, schemaReady).enabled;
}

function anonymousEdgeRateLimit(input: anonymousRateLimit.RateLimitInput): anonymousRateLimit.RateLimitDecision {
  return {
    allowed: true,
    key: 'anonymous:edge:' + input.scope,
    limit: input.limit || anonymousRateLimit.DEFAULT_LIMIT,
    remaining: input.limit || anonymousRateLimit.DEFAULT_LIMIT,
    resetAtMs: (input.nowMs || Date.now()) + (input.windowMs || anonymousRateLimit.DEFAULT_WINDOW_MS)
  };
}

function anonymousRuntimeCanUseDefaultDependencies(): boolean {
  return (
    (anonymousRuntime.anonymousRateLimitMode() === 'edge' && process.env.UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT === '1') ||
    (anonymousRuntime.anonymousRateLimitMode() === 'shared' && process.env.UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT === '1')
  );
}

function anonymousDefaultRateLimit(input: anonymousRateLimit.RateLimitInput, callback: anonymousRateLimit.RateLimitCallback): void {
  if (anonymousRuntime.anonymousRateLimitMode() === 'edge') {
    callback(null, anonymousEdgeRateLimit(input));
    return;
  }

  if (anonymousRuntime.anonymousRateLimitMode() === 'shared') {
    anonymousRateLimit.checkSharedRateLimit(input, callback);
    return;
  }

  callback(null, {
    allowed: false,
    key: 'anonymous:unavailable:' + input.scope,
    limit: 1,
    remaining: 0,
    resetAtMs: (input.nowMs || Date.now()) + anonymousRateLimit.DEFAULT_WINDOW_MS
  });
}

function anonymousFailureRateLimitDecision(
  request: IncomingMessage,
  scope: 'origin_failure' | 'csrf_failure',
  failureType: string
): anonymousRateLimit.RateLimitDecision {
  return anonymousRateLimit.checkAnonymousRateLimit({
    scope: scope,
    ip: anonymousRateLimit.clientIpForRateLimit(
      request.headers,
      request.socket ? request.socket.remoteAddress || undefined : undefined,
      process.env.UTOPLAN_TRUST_PROXY === '1'
    ),
    origin: typeof request.headers.origin === 'string' ? request.headers.origin : null,
    failureType: failureType
  });
}

function defaultAnonymousSchemaReady(callback: (ready: boolean) => void): void {
  if (!anonymousRuntime.anonymousRuntimeRequested()) {
    callback(false);
    return;
  }

  db.anonymousReady(function(error) {
    if (error) {
      callback(false);
      return;
    }

    callback(true);
  });
}

function defaultAnonymousDependencies(): anonymousEndpointHandlers.AnonymousEndpointDependencies {
  return {
    allowedOrigins: anonymousAllowedOrigins(),
    trustedProxy: process.env.UTOPLAN_TRUST_PROXY === '1',
    createSecret: anonymousSecurity.createAnonymousSecret,
    createPublicId: anonymousSecurity.generateOpaqueToken,
    checkRateLimit: anonymousDefaultRateLimit,
    createSession: anonymousProfile.createAnonymousSession,
    findSessionByTokenHash: anonymousProfile.findActiveSessionByTokenHash,
    findProfile: anonymousProfile.findOwnedProfile,
    findProfileState: anonymousProfile.findProfileState,
    revokeSession: anonymousProfile.revokeAnonymousSession,
    recordEvent: anonymousProfile.recordAnonymousProfileEvent,
    updateProfile: anonymousProfile.updateOwnedProfile,
    deleteProfileAndRevoke: anonymousProfile.deleteOwnedProfileAndRevoke
  };
}

function readRequestBody(request: IncomingMessage, callback: (error: Error | null, body?: string) => void): void {
  const chunks: Buffer[] = [];
  let size = 0;
  let done = false;
  const oversizedBody = 'x'.repeat(anonymousProfileValidation.MAX_PROFILE_BODY_BYTES + 1);

  function finish(error: Error | null, body?: string): void {
    if (done) {
      return;
    }

    done = true;
    callback(error, body);
  }

  request.on('data', function(chunk: Buffer | string) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (done) {
      return;
    }

    if (size > anonymousProfileValidation.MAX_PROFILE_BODY_BYTES) {
      finish(null, oversizedBody);
      request.resume();
      return;
    }

    chunks.push(buffer);
  });

  request.on('end', function() {
    finish(null, Buffer.concat(chunks).toString('utf8'));
  });

  request.on('error', function(error) {
    finish(error);
  });
}

function sendBody(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: string,
  headers: OutgoingHttpHeaders
): void {
  if (acceptsGzip(request)) {
    zlib.gzip(body, function(error: Error | null, compressed: Buffer) {
      if (error) {
        response.writeHead(500, headers);
        response.end(JSON.stringify({error: 'gzip_failed'}));
        return;
      }

      response.writeHead(statusCode, Object.assign({}, headers, {
        'Content-Encoding': 'gzip'
      }));
      response.end(compressed);
    });
    return;
  }

  response.writeHead(statusCode, headers);
  response.end(body);
}

function sendJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: string,
  extraHeaders?: OutgoingHttpHeaders
): void {
  sendBody(request, response, statusCode, body, Object.assign({}, CORS_HEADERS, extraHeaders || {}, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'utoplan-modern-api'
  }));
}

function sendAnonymousJson(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  statusCode: number,
  body: string,
  extraHeaders?: OutgoingHttpHeaders
): void {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
  const corsHeaders = anonymousCorsHeaders(pathname, origin);

  if (corsHeaders === null) {
    sendBody(request, response, 403, responseContract.serialize(
      responseContract.errorPayload('Forbidden')
    ), {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Powered-By': 'utoplan-modern-api',
      Vary: 'Origin'
    });
    return;
  }

  sendBody(request, response, statusCode, body, Object.assign({}, corsHeaders, extraHeaders || {}, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'utoplan-modern-api'
  }));
}

function handleRoot(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 200, rootContract.serializeRootPayload());
}

function handleHealth(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 200, responseContract.serialize({
    status: 'ok',
    service: 'utoplan-modern-api'
  }));
}

function handleReadiness(request: IncomingMessage, response: ServerResponse): void {
  db.ready(function(error: Error | null, status) {
    const loadIndexes = status && status.loadIndexes ? status.loadIndexes : null;

    if (error) {
      console.error(error.stack || error.message);

      sendJson(request, response, 503, responseContract.serialize({
        status: 'error',
        service: 'utoplan-modern-api',
        database: status ? 'ok' : 'unavailable',
        schema: status ? 'unavailable' : 'unknown',
        schemaVersion: status ? status.version : null,
        loadPolicyIndexes: loadIndexes ? (loadIndexes.ok ? 'ok' : 'missing') : 'unknown',
        missingLoadPolicyIndexes: loadIndexes ? loadIndexes.missing : []
      }));
      return;
    }

    sendJson(request, response, 200, responseContract.serialize({
      status: 'ok',
      service: 'utoplan-modern-api',
      database: 'ok',
      schema: 'ok',
      schemaVersion: status ? status.version : null,
      loadPolicyIndexes: loadIndexes ? (loadIndexes.ok ? 'ok' : (loadIndexes.unavailable ? 'unavailable' : 'missing')) : 'unknown',
      missingLoadPolicyIndexes: loadIndexes ? loadIndexes.missing : []
    }));
  });
}

function handleSourceMetadata(request: IncomingMessage, response: ServerResponse): void {
  try {
    sendJson(request, response, 200, responseContract.serialize(sourceMetadata.payload()));
  } catch (error) {
    const metadataError = error as Error;
    console.error(metadataError.stack || metadataError.message);

    sendJson(request, response, 500, responseContract.serialize(
      responseContract.errorPayload('Internal Server Error')
    ));
  }
}

function handlePlanningContextDemo(request: IncomingMessage, response: ServerResponse): void {
  try {
    sendJson(request, response, 200, responseContract.serialize(planningContext.payload()));
  } catch (error) {
    const contextError = error as Error;
    console.error(contextError.stack || contextError.message);

    sendJson(request, response, 500, responseContract.serialize(
      responseContract.errorPayload('Internal Server Error')
    ));
  }
}

function handleDemoSession(request: IncomingMessage, response: ServerResponse, query: demoSession.DemoSessionQuery): void {
  demoSession.payload(query, function(error, payload) {
    if (error) {
      console.error(error.stack || error.message);

      sendJson(request, response, 500, responseContract.serialize(
        responseContract.errorPayload('Internal Server Error')
      ));
      return;
    }

    if (!payload) {
      handleNotFound(request, response);
      return;
    }

    sendJson(request, response, 200, responseContract.serialize(payload));
  });
}

function handleRecord(request: IncomingMessage, response: ServerResponse, kind: string, id: number): void {
  records.find(kind, id, function(error, row, resource) {
    if (error) {
      console.error(error.stack || error.message);

      sendJson(request, response, 500, responseContract.serialize(
        responseContract.errorPayload('Internal Server Error')
      ));
      return;
    }

    if (!resource) {
      handleNotFound(request, response);
      return;
    }

    sendJson(request, response, row ? 200 : 404, responseContract.serialize(records.payload(row, resource)));
  });
}

function handleCollection(request: IncomingMessage, response: ServerResponse, kind: string, query: records.CollectionQuery): void {
  records.list(kind, query, function(error, rows, resource, total, offset) {
    if (error) {
      console.error(error.stack || error.message);

      sendJson(request, response, 500, responseContract.serialize(
        responseContract.errorPayload('Internal Server Error')
      ));
      return;
    }

    if (!resource) {
      handleNotFound(request, response);
      return;
    }

    sendJson(request, response, 200, responseContract.serialize(records.collectionPayload(rows, resource, total, offset)));
  });
}

function handleBadRequest(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 400, responseContract.serialize(
    responseContract.errorPayload('Bad Request')
  ));
}

function handleNotImplemented(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 501, responseContract.serialize(
    responseContract.errorPayload('Not Implemented')
  ));
}

function handleAnonymousNotImplemented(request: IncomingMessage, response: ServerResponse, pathname: string): void {
  sendAnonymousJson(request, response, pathname, 501, responseContract.serialize(
    responseContract.errorPayload('Not Implemented')
  ));
}

function handleAnonymousForbidden(request: IncomingMessage, response: ServerResponse, pathname: string): void {
  sendAnonymousJson(request, response, pathname, 403, responseContract.serialize(
    responseContract.errorPayload('Forbidden')
  ));
}

function handleAnonymousRateLimited(request: IncomingMessage, response: ServerResponse, pathname: string, decision: anonymousRateLimit.RateLimitDecision): void {
  sendAnonymousJson(request, response, pathname, 429, responseContract.serialize(
    responseContract.errorPayload('Too Many Requests')
  ), anonymousRateLimit.anonymousRateLimitHeaders(decision));
}

function handleAnonymousRuntimeResult(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  error: Error | null,
  result?: anonymousEndpointHandlers.AnonymousEndpointResult
): void {
  if (error) {
    console.error(error.stack || error.message);

    sendAnonymousJson(request, response, pathname, 500, responseContract.serialize(
      responseContract.errorPayload('Internal Server Error')
    ));
    return;
  }

  if (!result) {
    sendAnonymousJson(request, response, pathname, 500, responseContract.serialize(
      responseContract.errorPayload('Internal Server Error')
    ));
    return;
  }

  sendAnonymousJson(request, response, pathname, result.statusCode, result.body, result.headers);
}

function handleAnonymousRuntime(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  body: string,
  deps: anonymousEndpointHandlers.AnonymousEndpointDependencies
): void {
  const runtimeRequest: anonymousEndpointHandlers.AnonymousEndpointRequest = {
    headers: request.headers,
    remoteAddress: request.socket ? request.socket.remoteAddress || undefined : undefined,
    body: body,
    now: new Date()
  };

  if (isAnonymousSessionPath(pathname) && request.method === 'POST') {
    anonymousEndpointHandlers.handleCreateAnonymousSession(runtimeRequest, deps, function(error, result) {
      handleAnonymousRuntimeResult(request, response, pathname, error, result);
    });
    return;
  }

  if (isAnonymousProfilePath(pathname) && request.method === 'GET') {
    anonymousEndpointHandlers.handleReadAnonymousProfile(runtimeRequest, deps, function(error, result) {
      handleAnonymousRuntimeResult(request, response, pathname, error, result);
    });
    return;
  }

  if (isAnonymousProfilePath(pathname) && request.method === 'PUT') {
    anonymousEndpointHandlers.handleUpdateAnonymousProfile(runtimeRequest, deps, function(error, result) {
      handleAnonymousRuntimeResult(request, response, pathname, error, result);
    });
    return;
  }

  if (isAnonymousProfilePath(pathname) && request.method === 'DELETE') {
    anonymousEndpointHandlers.handleDeleteAnonymousProfile(runtimeRequest, deps, function(error, result) {
      handleAnonymousRuntimeResult(request, response, pathname, error, result);
    });
    return;
  }

  handleAnonymousNotImplemented(request, response, pathname);
}

function handleMethodNotAllowed(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 405, responseContract.serialize(
    responseContract.errorPayload('Method Not Allowed')
  ), {
    Allow: 'GET, OPTIONS'
  });
}

function handleAnonymousMethodNotAllowed(request: IncomingMessage, response: ServerResponse, pathname: string): void {
  sendAnonymousJson(request, response, pathname, 405, responseContract.serialize(
    responseContract.errorPayload('Method Not Allowed')
  ), {
    Allow: anonymousAllowedMethods(pathname).replace(', OPTIONS', '')
  });
}

function handleNotFound(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 404, responseContract.serialize(
    responseContract.errorPayload('Not Found')
  ));
}

export function createServer(options?: ServerOptions): Server {
  const serverOptions = options || {};
  const schemaReady = serverOptions.anonymousSchemaReady || defaultAnonymousSchemaReady;
  const anonymousDeps = serverOptions.anonymousDependencies || defaultAnonymousDependencies();
  const hasInjectedAnonymousDependencies = Boolean(serverOptions.anonymousDependencies);

  return http.createServer(function(request: IncomingMessage, response: ServerResponse) {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

    if (request.method === 'OPTIONS' && isAnonymousReservedPath(pathname)) {
      const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
      const corsHeaders = anonymousCorsHeaders(pathname, origin);

      if (corsHeaders === null) {
        response.writeHead(403, {
          Vary: 'Origin'
        });
        response.end();
        return;
      }

      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (request.method === 'GET' && pathname === '/') {
      handleRoot(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/healthz') {
      handleHealth(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/readyz') {
      handleReadiness(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/v1/source-metadata') {
      handleSourceMetadata(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/v1/planning/context-demo') {
      handlePlanningContextDemo(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/v1/planning/context') {
      const query = planningContext.parseLiveQuery(requestUrl.searchParams, planningContext.readCategoryContract());

      if (!query.ok || !query.query) {
        handleBadRequest(request, response);
        return;
      }

      planningContext.livePayload(query.query, function(error, payload) {
        if (error) {
          console.error(error.stack || error.message);

          sendJson(request, response, 500, responseContract.serialize(
            responseContract.errorPayload('Internal Server Error')
          ));
          return;
        }

        if (!payload) {
          handleNotFound(request, response);
          return;
        }

        sendJson(request, response, 200, responseContract.serialize(payload));
      });
      return;
    }

    if (request.method === 'GET' && pathname === '/v1/demo/session') {
      if (!demoSession.endpointEnabled()) {
        handleNotFound(request, response);
        return;
      }

      const query = demoSession.parseSessionQuery(requestUrl.searchParams);

      if (!query.ok || !query.query) {
        handleBadRequest(request, response);
        return;
      }

      handleDemoSession(request, response, query.query);
      return;
    }

    if (isAnonymousSessionPath(pathname)) {
      if (request.method === 'POST') {
        if (!hasSameOriginSignal(request)) {
          const failureDecision = anonymousFailureRateLimitDecision(request, 'origin_failure', 'session_creation_origin');

          if (!failureDecision.allowed) {
            handleAnonymousRateLimited(request, response, pathname, failureDecision);
            return;
          }

          handleAnonymousForbidden(request, response, pathname);
          return;
        }

        schemaReady(function(ready) {
          if (!anonymousRuntimeEnabled(ready) || (!hasInjectedAnonymousDependencies && !anonymousRuntimeCanUseDefaultDependencies())) {
            const rateLimitDecision = anonymousRateLimitDecision(request, pathname);

            if (rateLimitDecision && !rateLimitDecision.allowed) {
              handleAnonymousRateLimited(request, response, pathname, rateLimitDecision);
              return;
            }

            handleAnonymousNotImplemented(request, response, pathname);
            return;
          }

          readRequestBody(request, function(readError, body) {
            if (readError) {
              handleAnonymousRuntimeResult(request, response, pathname, readError);
              return;
            }

            handleAnonymousRuntime(request, response, pathname, body || '', anonymousDeps);
          });
        });
        return;
      }

      handleAnonymousMethodNotAllowed(request, response, pathname);
      return;
    }

    if (isAnonymousProfilePath(pathname)) {
      if (request.method === 'GET') {
        if (!anonymousCorsHeaders(pathname, typeof request.headers.origin === 'string' ? request.headers.origin : undefined)) {
          const failureDecision = anonymousFailureRateLimitDecision(request, 'origin_failure', 'profile_read_origin');

          if (!failureDecision.allowed) {
            handleAnonymousRateLimited(request, response, pathname, failureDecision);
            return;
          }

          handleAnonymousForbidden(request, response, pathname);
          return;
        }

        schemaReady(function(ready) {
          if (!anonymousRuntimeEnabled(ready) || (!hasInjectedAnonymousDependencies && !anonymousRuntimeCanUseDefaultDependencies())) {
            const rateLimitDecision = anonymousRateLimitDecision(request, pathname);

            if (rateLimitDecision && !rateLimitDecision.allowed) {
              handleAnonymousRateLimited(request, response, pathname, rateLimitDecision);
              return;
            }

            handleAnonymousNotImplemented(request, response, pathname);
            return;
          }

          handleAnonymousRuntime(request, response, pathname, '', anonymousDeps);
        });
        return;
      }

      if (request.method === 'PUT' || request.method === 'DELETE') {
        if (!hasSameOriginSignal(request)) {
          const failureDecision = anonymousFailureRateLimitDecision(request, 'origin_failure', 'profile_mutation_origin');

          if (!failureDecision.allowed) {
            handleAnonymousRateLimited(request, response, pathname, failureDecision);
            return;
          }

          handleAnonymousForbidden(request, response, pathname);
          return;
        }

        if (!hasCsrfHeader(request)) {
          const failureDecision = anonymousFailureRateLimitDecision(request, 'csrf_failure', 'profile_mutation_missing_csrf');

          if (!failureDecision.allowed) {
            handleAnonymousRateLimited(request, response, pathname, failureDecision);
            return;
          }

          handleAnonymousForbidden(request, response, pathname);
          return;
        }

        schemaReady(function(ready) {
          if (!anonymousRuntimeEnabled(ready) || (!hasInjectedAnonymousDependencies && !anonymousRuntimeCanUseDefaultDependencies())) {
            const rateLimitDecision = anonymousRateLimitDecision(request, pathname);

            if (rateLimitDecision && !rateLimitDecision.allowed) {
              handleAnonymousRateLimited(request, response, pathname, rateLimitDecision);
              return;
            }

            handleAnonymousNotImplemented(request, response, pathname);
            return;
          }

          readRequestBody(request, function(readError, body) {
            if (readError) {
              handleAnonymousRuntimeResult(request, response, pathname, readError);
              return;
            }

            handleAnonymousRuntime(request, response, pathname, body || '', anonymousDeps);
          });
        });
        return;
      }

      handleAnonymousMethodNotAllowed(request, response, pathname);
      return;
    }

    const recordMatch = matchRecord(pathname);
    const collectionMatch = matchCollection(pathname);

    if (request.method === 'GET' && collectionMatch) {
      const collectionQuery = parseCollectionQuery(requestUrl.searchParams);

      if (!collectionQuery) {
        handleBadRequest(request, response);
        return;
      }

      handleCollection(request, response, collectionMatch[1], collectionQuery);
      return;
    }

    if (request.method === 'GET' && recordMatch) {
      handleRecord(request, response, recordMatch[1], Number(recordMatch[2]));
      return;
    }

    if (recordMatch || collectionMatch || pathname === '/v1/source-metadata' || pathname === '/v1/planning/context-demo' || pathname === '/v1/planning/context' || pathname === '/v1/demo/session') {
      handleMethodNotAllowed(request, response);
      return;
    }

    handleNotFound(request, response);
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3001;

  if (process.env.NODE_ENV === 'production' && !db.hasExplicitConnectionConfig()) {
    console.error('DATABASE_URL or DATABASE_HOST, DATABASE_USER, and DATABASE_DB are required in production');
    process.exit(1);
  }

  createServer().listen(port, function() {
    console.log('modern api listening on port ' + port);
  });
}
