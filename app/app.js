var fs = require('fs');
var http = require('http');
var path = require('path');

var port = process.env.PORT || 8080;
var publicDir = path.join(__dirname, 'public');

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

function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return send(response, 405, 'Method Not Allowed', {
      'Content-Type': 'text/plain; charset=utf-8',
      'Allow': 'GET, HEAD'
    });
  }

  if (request.url.split('?')[0] === '/v1/unis/1') {
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

http.createServer(serve).listen(port, function() {
  console.log('app listening on port ' + port);
});
