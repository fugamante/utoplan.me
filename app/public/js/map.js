import {
  normalizeUniversities,
  readMapConfig
} from "./map_config.js";

function createMap(document, L, config) {
  var mapElement = document.querySelector('[data-map="main"]');
  var map = L.map(mapElement).setView(config.center, config.zoom);

  if (config.tileUrl) {
    L.tileLayer(config.tileUrl, {
      attribution: ""
    }).addTo(map);
  }

  return map;
}

function addUniversities(map, L, universities) {
  universities.forEach(function(university) {
    var marker = L.marker(university.position).addTo(map);
    marker.bindPopup(university.title + "<br/>" + university.position.toString()).openPopup();
  });
}

function loadUniversities(window, config, callback) {
  var request = new XMLHttpRequest();
  request.open("GET", config.dataUrl, true);
  request.setRequestHeader("Content-Type", "application/json");

  request.onreadystatechange = function() {
    if (request.readyState !== 4 || request.status !== 200) {
      return;
    }

    callback(normalizeUniversities(JSON.parse(request.responseText)));
  };

  request.send();
}

function init(window, document, L) {
  var config = readMapConfig(window);
  var map = createMap(document, L, config);

  loadUniversities(window, config, function(universities) {
    addUniversities(map, L, universities);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    init(window, document, L);
  });
} else {
  init(window, document, L);
}
