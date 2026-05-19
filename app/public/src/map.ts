import {
  type MapConfig,
  type NormalizedUniversity,
  type UniversityPayload,
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
  fetch: typeof fetch;
  XMLHttpRequest: typeof XMLHttpRequest;
  UTOPLAN_API_URL?: string;
  UTOPLAN_TILE_ATTRIBUTION?: string;
  UTOPLAN_TILE_URL?: string;
}

type UniversityCallback = (universities: NormalizedUniversity[]) => void;

interface RequestWindow {
  fetch: typeof fetch;
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
  loadUniversityUrl(windowRef, config.dataUrl, function(universities: NormalizedUniversity[] | null): void {
    if (universities) {
      callback(universities);
      return;
    }

    loadUniversityUrl(windowRef, config.fallbackDataUrl, function(fallbackUniversities: NormalizedUniversity[] | null): void {
      callback(fallbackUniversities || []);
    });
  });
}

function loadUniversityUrl(windowRef: RequestWindow, dataUrl: string, callback: (universities: NormalizedUniversity[] | null) => void): void {
  windowRef.fetch(dataUrl, {
    headers: {
      "Content-Type": "application/json"
    }
  }).then(function(response: Response): Promise<unknown> | null {
    if (!response.ok) {
      callback(null);
      return null;
    }

    return response.json();
  }).then(function(payload: unknown): void {
    if (payload) {
      callback(normalizeUniversities(payload as UniversityPayload));
    }
  }).catch(function(): void {
    callback(null);
  });
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
