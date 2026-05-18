(function(window, document, L) {
  "use strict";

  var DEFAULT_CENTER = [18.4110494, -66.0985525];
  var DEFAULT_ZOOM = 8;
  var DEFAULT_DATA_URL = "/data/unis.json";

  function createMap() {
    var mapElement = document.querySelector('[data-map="main"]');
    var map = L.map(mapElement).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    if (window.UTOPLAN_TILE_URL) {
      L.tileLayer(window.UTOPLAN_TILE_URL, {
        attribution: ""
      }).addTo(map);
    }

    return map;
  }

  function universityPosition(university) {
    return [university.lat, university.long];
  }

  function addUniversities(map, universities) {
    universities.forEach(function(university) {
      var position = universityPosition(university);
      var marker = L.marker(position).addTo(map);
      marker.bindPopup(university.title + "<br/>" + position.toString()).openPopup();
    });
  }

  function loadUniversities(callback) {
    var request = new XMLHttpRequest();
    request.open("GET", window.UTOPLAN_API_URL || DEFAULT_DATA_URL, true);
    request.setRequestHeader("Content-Type", "application/json");

    request.onreadystatechange = function() {
      if (request.readyState !== 4 || request.status !== 200) {
        return;
      }

      var payload = JSON.parse(request.responseText);
      callback(payload.data || []);
    };

    request.send();
  }

  function init() {
    var map = createMap();
    loadUniversities(function(universities) {
      addUniversities(map, universities);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}(window, document, L));
