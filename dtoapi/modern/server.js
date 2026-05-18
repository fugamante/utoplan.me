'use strict';

const http = require('http');
const URL = require('url').URL;
const zlib = require('zlib');
const records = require('./records');
const rootContract = require('./root_contract');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function acceptsGzip(request) {
  return (request.headers['accept-encoding'] || '').indexOf('gzip') !== -1;
}

function sendJson(request, response, statusCode, body, extraHeaders) {
  const headers = Object.assign({}, CORS_HEADERS, extraHeaders || {}, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'utoplan-modern-api'
  });

  if (acceptsGzip(request)) {
    return zlib.gzip(body, function(error, compressed) {
      if (error) {
        response.writeHead(500, headers);
        return response.end(JSON.stringify({error: 'gzip_failed'}));
      }

      response.writeHead(statusCode, Object.assign({}, headers, {
        'Content-Encoding': 'gzip'
      }));
      response.end(compressed);
    });
  }

  response.writeHead(statusCode, headers);
  response.end(body);
}

function handleRoot(request, response) {
  sendJson(request, response, 200, rootContract.serializeRootPayload());
}

function handleRecord(request, response, kind, id) {
  records.find(kind, id, function(error, row, resource) {
    if (error) {
      console.error(error.stack || error.message);

      return sendJson(request, response, 500, JSON.stringify({
        meta: {
          total: 0,
          count: 0,
          offset: 0,
          error: 'Internal Server Error'
        },
        data: []
      }, null, 2));
    }

    if (!resource) {
      return handleNotFound(request, response);
    }

    sendJson(request, response, row ? 200 : 404, JSON.stringify(records.payload(row, resource), null, 2));
  });
}

function handleMethodNotAllowed(request, response) {
  sendJson(request, response, 405, JSON.stringify({
    meta: {
      total: 0,
      count: 0,
      offset: 0,
      error: 'Method Not Allowed'
    },
    data: []
  }, null, 2), {
    Allow: 'GET, OPTIONS'
  });
}

function handleNotFound(request, response) {
  sendJson(request, response, 404, JSON.stringify({
    meta: {
      total: 0,
      count: 0,
      offset: 0,
      error: 'Not Found'
    },
    data: []
  }, null, 2));
}

function matchRecord(pathname) {
  return pathname.match(/^\/v1\/(unis|muns|cdepts|cbps|busines|grace_cs)\/([0-9]+)$/);
}

function createServer() {
  return http.createServer(function(request, response) {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      return response.end();
    }

    if (request.method === 'GET' && pathname === '/') {
      return handleRoot(request, response);
    }

    const recordMatch = matchRecord(pathname);

    if (request.method === 'GET' && recordMatch) {
      return handleRecord(request, response, recordMatch[1], Number(recordMatch[2]));
    }

    if (recordMatch) {
      return handleMethodNotAllowed(request, response);
    }

    handleNotFound(request, response);
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  createServer().listen(port, function() {
    console.log('modern api listening on port ' + port);
  });
}

module.exports = {
  createServer: createServer,
  matchRecord: matchRecord
};
