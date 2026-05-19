import { normalizeUniversities, readMapConfig } from "./map_config.js";
export function createMap(documentRef, leaflet, config) {
    const mapElement = documentRef.querySelector('[data-map="main"]');
    if (!mapElement) {
        throw new Error("Map element not found");
    }
    const map = leaflet.map(mapElement).setView(config.center, config.zoom);
    if (config.tileUrl) {
        leaflet.tileLayer(config.tileUrl, {
            attribution: config.tileAttribution
        }).addTo(map);
    }
    return map;
}
export function addUniversities(map, leaflet, universities) {
    universities.forEach(function (university) {
        const marker = leaflet.marker(university.position).addTo(map);
        marker.bindPopup(university.title + "<br/>" + university.position.toString()).openPopup();
    });
}
export function loadUniversities(windowRef, config, callback) {
    loadUniversityUrl(windowRef, config.dataUrl, function (universities) {
        if (universities) {
            callback(universities);
            return;
        }
        loadUniversityUrl(windowRef, config.fallbackDataUrl, function (fallbackUniversities) {
            callback(fallbackUniversities || []);
        });
    });
}
function loadUniversityUrl(windowRef, dataUrl, callback) {
    windowRef.fetch(dataUrl, {
        headers: {
            "Content-Type": "application/json"
        }
    }).then(function (response) {
        if (!response.ok) {
            callback(null);
            return null;
        }
        return response.json();
    }).then(function (payload) {
        if (payload) {
            callback(normalizeUniversities(payload));
        }
    }).catch(function () {
        callback(null);
    });
}
export function init(windowRef, documentRef, leaflet) {
    const config = readMapConfig(windowRef);
    const map = createMap(documentRef, leaflet, config);
    loadUniversities(windowRef, config, function (universities) {
        addUniversities(map, leaflet, universities);
    });
}
const browserWindow = window;
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        init(browserWindow, document, browserWindow.L);
    });
}
else {
    init(browserWindow, document, browserWindow.L);
}
