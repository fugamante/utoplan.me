var assert = require('assert');
var fs = require('fs');
var path = require('path');

function moduleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
}

async function main() {
  var configUrl = moduleUrl(fs.readFileSync(path.join(__dirname, '../public/js/map_config.js'), 'utf8'));
  var mapSource = fs.readFileSync(path.join(__dirname, '../public/js/map.js'), 'utf8');
  // Resolve the compiled module's dependency without changing the package to ESM.
  var mapUrl = moduleUrl(mapSource.replace('"./map_config.js"', JSON.stringify(configUrl)));
  var previousWindow = global.window;
  var previousDocument = global.document;
  var mapModule;

  global.window = {};
  global.document = {readyState: 'loading', addEventListener: function() {}};
  try {
    mapModule = await import(mapUrl);
  } finally {
    if (previousWindow === undefined) {
      delete global.window;
    } else {
      global.window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete global.document;
    } else {
      global.document = previousDocument;
    }
  }

  var mapConfig = await import(configUrl);
  var fixtures = [
    {title: 'Universidad Politécnica de Puerto Rico', html: 'Universidad Politécnica de Puerto Rico'},
    {title: '<img src=x onerror="window.popupExecuted=1">', html: '&lt;img src=x onerror=&quot;window.popupExecuted=1&quot;&gt;'},
    {title: '<svg onload="window.popupExecuted=1"></svg>', html: '&lt;svg onload=&quot;window.popupExecuted=1&quot;&gt;&lt;/svg&gt;'},
    {title: 'Campus & < > " \'', html: 'Campus &amp; &lt; &gt; &quot; &#39;'},
    {title: '&lt;img src=x&gt;', html: '&amp;lt;img src=x&amp;gt;'},
    {title: '', html: ''}
  ];
  var map = {};
  var popups = [];
  var positions = [];
  var opened = 0;
  var leaflet = {
    marker: function(position) {
      positions.push(position);
      return {
        addTo: function(target) {
          assert.strictEqual(target, map, 'markers should retain the target map');
          return this;
        },
        bindPopup: function(content) {
          popups.push(content);
          return this;
        },
        openPopup: function() {
          opened += 1;
          return this;
        }
      };
    }
  };
  var universities = mapConfig.normalizeUniversities({
    data: fixtures.map(function(fixture) {
      return {title: fixture.title, lat: '18.42', long: '-66.06'};
    })
  });

  mapModule.addUniversities(map, leaflet, universities);

  assert.strictEqual(popups.length, fixtures.length, 'every university should retain its popup');
  assert.strictEqual(opened, fixtures.length, 'every marker should retain popup opening behavior');
  fixtures.forEach(function(fixture, index) {
    assert.strictEqual(universities[index].title, fixture.title, 'normalization should preserve title data');
    assert.deepStrictEqual(positions[index], [18.42, -66.06], 'marker coordinates should remain normalized numbers');
    assert.strictEqual(popups[index], fixture.html + '<br/>18.42,-66.06', 'popup titles should be text while the line break and coordinate presentation remain unchanged');
  });
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
