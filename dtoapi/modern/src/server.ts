'use strict';

import http, {type IncomingMessage, type OutgoingHttpHeaders, type Server, type ServerResponse} from 'http';
import {URL} from 'url';
import zlib from 'zlib';
import * as db from './db';
import * as records from './records';
import * as responseContract from './response_contract';
import * as rootContract from './root_contract';

export const CORS_HEADERS: OutgoingHttpHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export function acceptsGzip(request: IncomingMessage): boolean {
  return String(request.headers['accept-encoding'] || '').indexOf('gzip') !== -1;
}

export function matchRecord(pathname: string): RegExpMatchArray | null {
  return pathname.match(/^\/v1\/(unis|muns|cdepts|cbps|busines|grace_cs)\/([0-9]+)$/);
}

export function matchCollection(pathname: string): RegExpMatchArray | null {
  return pathname.match(/^\/v1\/(unis|muns|cdepts|cbps|busines|grace_cs)$/);
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

function handleCollection(request: IncomingMessage, response: ServerResponse, kind: string): void {
  records.list(kind, function(error, rows, resource) {
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

    sendJson(request, response, 200, responseContract.serialize(records.collectionPayload(rows, resource)));
  });
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
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;

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

    const recordMatch = matchRecord(pathname);
    const collectionMatch = matchCollection(pathname);

    if (request.method === 'GET' && collectionMatch) {
      handleCollection(request, response, collectionMatch[1]);
      return;
    }

    if (request.method === 'GET' && recordMatch) {
      handleRecord(request, response, recordMatch[1], Number(recordMatch[2]));
      return;
    }

    if (recordMatch || collectionMatch) {
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
