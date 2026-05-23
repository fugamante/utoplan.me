var assert = require('assert');
var fs = require('fs');
var path = require('path');

async function importMapModule() {
  var mapConfigSource = fs.readFileSync(path.join(__dirname, '../public/js/map_config.js'), 'utf8');
  var mapConfigUrl = 'data:text/javascript;base64,' + Buffer.from(mapConfigSource).toString('base64');
  var mapSource = fs.readFileSync(path.join(__dirname, '../public/js/map.js'), 'utf8')
    .replace('from "./map_config.js";', 'from "' + mapConfigUrl + '";');
  var mapUrl = 'data:text/javascript;base64,' + Buffer.from(mapSource).toString('base64');

  global.window = {
    L: {},
    fetch: function() {},
    XMLHttpRequest: function() {}
  };
  global.document = {
    readyState: 'loading',
    addEventListener: function() {}
  };

  return import(mapUrl);
}

function statusDocument() {
  var statusElement = {
    attributes: {},
    textContent: '',
    setAttribute: function(name, value) {
      this.attributes[name] = value;
    }
  };

  return {
    statusElement: statusElement,
    documentRef: {
      querySelector: function(selector) {
        return selector === '[data-map-status="main"]' ? statusElement : null;
      }
    }
  };
}

function fetchWindow(responses) {
  return {
    fetch: function(dataUrl) {
      var response = responses.shift();

      assert.strictEqual(dataUrl, response.url);

      if (response.reject) {
        return Promise.reject(new Error('failed'));
      }

      return Promise.resolve({
        ok: response.ok,
        json: function() {
          return Promise.resolve(response.body);
        }
      });
    }
  };
}

async function load(module, responses) {
  return new Promise(function(resolve) {
    module.loadUniversities(fetchWindow(responses), {
      dataUrl: '/v1/unis',
      fallbackDataUrl: '/data/unis.json'
    }, resolve);
  });
}

async function main() {
  var map = await importMapModule();
  var status = statusDocument();
  var result;

  map.setMapStatus(status.documentRef, 'loading', 'Loading map data...');
  assert.strictEqual(status.statusElement.attributes['data-state'], 'loading');
  assert.strictEqual(status.statusElement.textContent, 'Loading map data...');

  result = await load(map, [{
    url: '/v1/unis',
    ok: true,
    body: {
      data: [{title: 'API University', lat: 18, long: -66}]
    }
  }]);
  assert.strictEqual(result.source, 'api');
  assert.strictEqual(result.universities[0].title, 'API University');

  result = await load(map, [{
    url: '/v1/unis',
    ok: false
  }, {
    url: '/data/unis.json',
    ok: true,
    body: {
      data: [{title: 'Fallback University', lat: 18, long: -66}]
    }
  }]);
  assert.strictEqual(result.source, 'fallback');
  assert.strictEqual(result.universities[0].title, 'Fallback University');

  result = await load(map, [{
    url: '/v1/unis',
    reject: true
  }, {
    url: '/data/unis.json',
    ok: false
  }]);
  assert.strictEqual(result.source, 'none');
  assert.deepStrictEqual(result.universities, []);
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
