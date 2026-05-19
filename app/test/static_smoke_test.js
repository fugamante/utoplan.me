var assert = require('assert');
var childProcess = require('child_process');
var http = require('http');

var port = process.env.SMOKE_PORT || '18080';
var baseUrl = 'http://127.0.0.1:' + port;
var server;

function request(path, headers) {
  return new Promise(function(resolve, reject) {
    var req = http.get({
      hostname: '127.0.0.1',
      port: port,
      path: path,
      headers: headers || {}
    }, function(res) {
      var chunks = [];

      res.on('data', function(chunk) {
        chunks.push(chunk);
      });

      res.on('end', function() {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, function() {
      req.destroy(new Error('Timed out requesting ' + path));
    });
  });
}

function waitForServer(deadline) {
  return request('/').catch(function(error) {
    if (Date.now() > deadline) {
      throw error;
    }

    return new Promise(function(resolve) {
      setTimeout(resolve, 100);
    }).then(function() {
      return waitForServer(deadline);
    });
  });
}

function stopServer() {
  if (server && !server.killed) {
    server.kill();
  }
}

async function main() {
  server = childProcess.spawn(process.execPath, ['app.js'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, { PORT: port }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.on('exit', function(code, signal) {
    if (code && code !== 0) {
      console.error('Static app exited with code ' + code + ' signal ' + signal);
    }
  });

  process.on('exit', stopServer);
  process.on('SIGINT', function() {
    stopServer();
    process.exit(130);
  });

  await waitForServer(Date.now() + 10000);

  var index = await request('/');
  assert.strictEqual(index.statusCode, 200, 'index should return HTTP 200');

  var html = index.body.toString('utf8');
  [
    'data-map="main"',
    'data-ui="layer-menu-toggle"',
    'data-ui="layer-menu"',
    'data-ui="layer-visibility"',
    'data-ui="sidebar"',
    'data-ui="sidebar-toggle"',
    'id="layersMenu"',
    'id="searchBar"',
    'id="queryList"',
    'id="sidebar"',
    'id="logo"',
    '<script type="module" src="js/map.js"></script>',
    '<script type="module" src="js/main.js"></script>'
  ].forEach(function(fragment) {
    assert(
      html.indexOf(fragment) !== -1,
      'index should include ' + fragment
    );
  });

  [
    'vendor/jquery/jquery.min.js',
    '$(document).ready',
    'PLUGIN REF'
  ].forEach(function(fragment) {
    assert(
      html.indexOf(fragment) === -1,
      'index should not include ' + fragment
    );
  });

  var assets = [
    '/css/main.css',
    '/css/reset.css',
    '/data/unis.json',
    '/js/main.js',
    '/js/map_config.js',
    '/js/map.js',
    '/vendor/jquery/jquery.min.js',
    '/vendor/leaflet/leaflet.css',
    '/vendor/leaflet/leaflet.js',
    '/vendor/require/require.js',
    '/vendor/xml2json/xml2json.js',
    '/img/imaginary-logo.png'
  ];

  for (var i = 0; i < assets.length; i++) {
    var asset = await request(assets[i]);
    assert.strictEqual(asset.statusCode, 200, assets[i] + ' should return HTTP 200');
    assert(asset.body.length > 0, assets[i] + ' should not be empty');
  }

  var apiFallback = await request('/v1/unis/1');
  assert.strictEqual(apiFallback.statusCode, 200, 'local API data fallback should return HTTP 200');
  assert.strictEqual(JSON.parse(apiFallback.body.toString('utf8')).data[0].title, 'University of Puerto Rico');

  var cached = await request('/css/main.css', {
    'If-None-Match': '"legacy-cache-validator"',
    'If-Modified-Since': new Date().toUTCString()
  });
  assert.strictEqual(cached.statusCode, 200, 'conditional asset request should not affect static asset serving');

  var missing = await request('/missing-file.css');
  assert.strictEqual(missing.statusCode, 404, 'missing assets should return HTTP 404');

  var traversal = await request('/../package.json');
  assert.strictEqual(traversal.statusCode, 400, 'path traversal should be rejected');
}

main().then(function() {
  stopServer();
}).catch(function(error) {
  stopServer();
  console.error(error.stack || error.message);
  process.exit(1);
});
