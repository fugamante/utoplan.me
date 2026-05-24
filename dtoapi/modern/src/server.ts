'use strict';

import http, {type IncomingMessage, type OutgoingHttpHeaders, type Server, type ServerResponse} from 'http';
import {URL} from 'url';
import zlib from 'zlib';
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

export const MAX_COLLECTION_LIMIT = 1000;
export const SUPPORTED_COLLECTION_QUERY_PARAMS = ['limit', 'offset'];

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

function sendJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: string,
  extraHeaders?: OutgoingHttpHeaders
): void {
  const headers = Object.assign({}, CORS_HEADERS, extraHeaders || {}, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'utoplan-modern-api'
  });

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

function handleMethodNotAllowed(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 405, responseContract.serialize(
    responseContract.errorPayload('Method Not Allowed')
  ), {
    Allow: 'GET, OPTIONS'
  });
}

function handleNotFound(request: IncomingMessage, response: ServerResponse): void {
  sendJson(request, response, 404, responseContract.serialize(
    responseContract.errorPayload('Not Found')
  ));
}

export function createServer(): Server {
  return http.createServer(function(request: IncomingMessage, response: ServerResponse) {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

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
