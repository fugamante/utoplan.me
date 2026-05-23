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
export function setMapStatus(documentRef, state, message) {
    const statusElement = documentRef.querySelector('[data-map-status="main"]');
    if (!statusElement) {
        return;
    }
    statusElement.setAttribute("data-state", state);
    statusElement.textContent = message;
}
export function loadUniversities(windowRef, config, callback) {
    loadUniversityUrl(windowRef, config.dataUrl, function (universities) {
        if (universities) {
            callback({
                universities: universities,
                source: "api"
            });
            return;
        }
        loadUniversityUrl(windowRef, config.fallbackDataUrl, function (fallbackUniversities) {
            if (fallbackUniversities) {
                callback({
                    universities: fallbackUniversities,
                    source: "fallback"
                });
                return;
            }
            callback({
                universities: [],
                source: "none"
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
            callback(normalizeUniversities(payload));
        }
    }).catch(function () {
        callback(null);
    });
}
export function init(windowRef, documentRef, leaflet) {
    const config = readMapConfig(windowRef);
    const map = createMap(documentRef, leaflet, config);
    setMapStatus(documentRef, "loading", "Loading map data...");
    loadUniversities(windowRef, config, function (result) {
        addUniversities(map, leaflet, result.universities);
        if (result.universities.length > 0 && result.source === "api") {
            setMapStatus(documentRef, "ready", "");
            return;
        }
        if (result.universities.length > 0 && result.source === "fallback") {
            setMapStatus(documentRef, "fallback", "Using offline university data while the API is unavailable.");
            return;
        }
        setMapStatus(documentRef, "error", "University data is unavailable. The map is loaded without university markers.");
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
