import {
  type MapConfig,
  type NormalizedUniversity,
  normalizeUniversities,
  readMapConfig
} from "./map_config.js";

interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
}

interface LeafletMarker {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(content: string): LeafletMarker;
  openPopup(): LeafletMarker;
}

interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
}

interface LeafletApi {
  map(element: Element): LeafletMap;
  marker(position: [number, number]): LeafletMarker;
  tileLayer(url: string, options: { attribution: string }): LeafletLayer;
}

interface UtoplanWindow extends Window {
  L: LeafletApi;
  XMLHttpRequest: typeof XMLHttpRequest;
  UTOPLAN_API_URL?: string;
  UTOPLAN_TILE_ATTRIBUTION?: string;
  UTOPLAN_TILE_URL?: string;
}

type UniversityCallback = (universities: NormalizedUniversity[]) => void;

interface RequestWindow {
  XMLHttpRequest: typeof XMLHttpRequest;
}

export function createMap(documentRef: Document, leaflet: LeafletApi, config: MapConfig): LeafletMap {
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

export function addUniversities(map: LeafletMap, leaflet: LeafletApi, universities: NormalizedUniversity[]): void {
  universities.forEach(function(university: NormalizedUniversity): void {
    const marker = leaflet.marker(university.position).addTo(map);
    marker.bindPopup(university.title + "<br/>" + university.position.toString()).openPopup();
  });
}

export function loadUniversities(windowRef: RequestWindow, config: MapConfig, callback: UniversityCallback): void {
  const request = new windowRef.XMLHttpRequest();
  request.open("GET", config.dataUrl, true);
  request.setRequestHeader("Content-Type", "application/json");

  request.onreadystatechange = function(): void {
    if (request.readyState !== 4 || request.status !== 200) {
      return;
    }

    callback(normalizeUniversities(JSON.parse(request.responseText)));
  };

  request.send();
}

export function init(windowRef: UtoplanWindow, documentRef: Document, leaflet: LeafletApi): void {
  const config = readMapConfig(windowRef);
  const map = createMap(documentRef, leaflet, config);

  loadUniversities(windowRef, config, function(universities: NormalizedUniversity[]): void {
    addUniversities(map, leaflet, universities);
  });
}

const browserWindow = window as unknown as UtoplanWindow;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function(): void {
    init(browserWindow, document, browserWindow.L);
  });
} else {
  init(browserWindow, document, browserWindow.L);
}
