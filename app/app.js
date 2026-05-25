var fs = require('fs');
var http = require('http');
var path = require('path');
var URL = require('url').URL;

var port = process.env.PORT || 8080;
var publicDir = path.join(__dirname, 'public');
var demoFixture = process.env.UTOPLAN_DEMO_FIXTURE === '1';
var apiOrigin = parseApiOrigin(process.env.UTOPLAN_API_ORIGIN);

var types = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function contentType(filePath) {
  return types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function safePath(urlPath) {
  var decoded;

  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch (error) {
    return null;
  }

  if (decoded === '/') {
    decoded = '/index.html';
  }

  var filePath = path.normalize(path.join(publicDir, decoded));

  if (filePath.indexOf(publicDir + path.sep) !== 0 && filePath !== publicDir) {
    return null;
  }

  return filePath;
}

function send(response, statusCode, body, headers) {
  response.writeHead(statusCode, headers || {});
  response.end(body);
}

function parseApiOrigin(value) {
  var origin;

  if (!value) {
    return null;
  }

  origin = new URL(value);
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') {
    throw new Error('UTOPLAN_API_ORIGIN must use http or https');
  }

  return origin;
}

function isApiPath(urlPath) {
  return urlPath.split('?')[0].indexOf('/v1/') === 0;
}

function sendHealth(response) {
  send(response, 200, JSON.stringify({
    status: 'ok',
    service: 'utoplan-static-app',
    apiProxy: Boolean(apiOrigin),
    demoFixture: demoFixture
  }), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
}

function proxyHeaders(request, target, clientIp) {
  var headers = Object.assign({}, request.headers);

  delete headers.forwarded;
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  delete headers['x-real-ip'];

  headers.host = target.host;
  headers['x-forwarded-for'] = clientIp;
  headers['x-real-ip'] = clientIp;

  return headers;
}

function proxyApi(request, response) {
  var target = new URL(request.url, apiOrigin);
  var clientIp = request.socket && request.socket.remoteAddress ? request.socket.remoteAddress : '';
  var proxyRequest = http.request(target, {
    method: request.method,
    headers: proxyHeaders(request, target, clientIp)
  }, function(proxyResponse) {
    response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });

  proxyRequest.on('error', function(error) {
    console.error('API proxy failed: ' + error.message);
    send(response, 502, 'Bad Gateway', {
      'Content-Type': 'text/plain; charset=utf-8'
    });
  });

  request.pipe(proxyRequest);
}

function serve(request, response) {
  if (apiOrigin && isApiPath(request.url)) {
    return proxyApi(request, response);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return send(response, 405, 'Method Not Allowed', {
      'Content-Type': 'text/plain; charset=utf-8',
      'Allow': 'GET, HEAD'
    });
  }

  if (request.url.split('?')[0] === '/healthz') {
    return sendHealth(response);
  }

  if (demoFixture && request.url.split('?')[0] === '/v1/unis') {
    request.url = '/data/unis.json';
  }

  var filePath = safePath(request.url);

  if (!filePath) {
    return send(response, 400, 'Bad Request', {
      'Content-Type': 'text/plain; charset=utf-8'
    });
  }

  fs.stat(filePath, function(statError, stats) {
    if (statError || !stats.isFile()) {
      return send(response, 404, 'Not Found', {
        'Content-Type': 'text/plain; charset=utf-8'
      });
    }

    var headers = {
      'Content-Type': contentType(filePath),
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    };

    if (request.method === 'HEAD') {
      return send(response, 200, '', headers);
    }

    response.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(response);
  });
}

if (apiOrigin && demoFixture) {
  console.error('UTOPLAN_API_ORIGIN and UTOPLAN_DEMO_FIXTURE=1 cannot be enabled together');
  process.exit(1);
}

http.createServer(serve).listen(port, function() {
  console.log('app listening on port ' + port);
});
