import { normalizeUniversityCoverage, normalizeUniversities, readMapConfig } from "./map_config.js";
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
function renderCoverage(documentRef, coverage) {
    const status = documentRef.querySelector('[data-ui="unis-coverage-status"]');
    const detail = documentRef.querySelector('[data-ui="unis-coverage-detail"]');
    if (!status || !detail) {
        return;
    }
    status.textContent = coverage ? coverage.label : "";
    detail.textContent = coverage ? coverage.limitation : "";
}
export function loadUniversities(windowRef, config, callback) {
    loadUniversityUrl(windowRef, config.dataUrl, function (result) {
        if (result) {
            callback(result.universities);
            return;
        }
        loadUniversityUrl(windowRef, config.fallbackDataUrl, function (fallbackResult) {
            callback(fallbackResult ? fallbackResult.universities : []);
        });
    });
}
export function loadUniversitiesWithCoverage(windowRef, config, callback) {
    loadUniversityUrl(windowRef, config.dataUrl, function (result) {
        if (result) {
            callback(result);
            return;
        }
        loadUniversityUrl(windowRef, config.fallbackDataUrl, function (fallbackResult) {
            callback(fallbackResult || {
                universities: [],
                coverage: null
            });
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
            const universityPayload = payload;
            callback({
                universities: normalizeUniversities(universityPayload),
                coverage: normalizeUniversityCoverage(universityPayload)
            });
        }
    }).catch(function () {
        callback(null);
    });
}
export function init(windowRef, documentRef, leaflet) {
    const config = readMapConfig(windowRef);
    const map = createMap(documentRef, leaflet, config);
    loadUniversitiesWithCoverage(windowRef, config, function (result) {
        renderCoverage(documentRef, result.coverage);
        addUniversities(map, leaflet, result.universities);
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
