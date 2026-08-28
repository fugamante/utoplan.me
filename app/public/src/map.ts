import {
  type MapConfig,
  type NormalizedUniversity,
  type NormalizedUniversityCoverage,
  type UniversityPayload,
  normalizeUniversityCoverage,
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

function renderCoverage(documentRef: Document, coverage: NormalizedUniversityCoverage | null): void {
  const status = documentRef.querySelector<HTMLElement>('[data-ui="unis-coverage-status"]');
  const detail = documentRef.querySelector<HTMLElement>('[data-ui="unis-coverage-detail"]');

  if (!status || !detail) {
    return;
  }

  status.textContent = coverage ? coverage.label : "";
  detail.textContent = coverage ? coverage.limitation : "";
}

export function loadUniversities(windowRef: RequestWindow, config: MapConfig, callback: UniversityCallback): void {
  loadUniversityUrl(windowRef, config.dataUrl, function(result: UniversityLoadResult | null): void {
    if (result) {
      callback(result.universities);
      return;
    }

    loadUniversityUrl(windowRef, config.fallbackDataUrl, function(fallbackResult: UniversityLoadResult | null): void {
      callback(fallbackResult ? fallbackResult.universities : []);
    });
  });
}

interface UniversityLoadResult {
  universities: NormalizedUniversity[];
  coverage: NormalizedUniversityCoverage | null;
}

export function loadUniversitiesWithCoverage(
  windowRef: RequestWindow,
  config: MapConfig,
  callback: (result: UniversityLoadResult) => void
): void {
  loadUniversityUrl(windowRef, config.dataUrl, function(result: UniversityLoadResult | null): void {
    if (result) {
      callback(result);
      return;
    }

    loadUniversityUrl(windowRef, config.fallbackDataUrl, function(fallbackResult: UniversityLoadResult | null): void {
      callback(fallbackResult || {
        universities: [],
        coverage: null
      });
    });
  });
}

function loadUniversityUrl(windowRef: RequestWindow, dataUrl: string, callback: (result: UniversityLoadResult | null) => void): void {
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
      const universityPayload = payload as UniversityPayload;
      callback({
        universities: normalizeUniversities(universityPayload),
        coverage: normalizeUniversityCoverage(universityPayload)
      });
    }
  }).catch(function(): void {
    callback(null);
  });
}

export function init(windowRef: UtoplanWindow, documentRef: Document, leaflet: LeafletApi): void {
  const config = readMapConfig(windowRef);
  const map = createMap(documentRef, leaflet, config);

  loadUniversitiesWithCoverage(windowRef, config, function(result: UniversityLoadResult): void {
    renderCoverage(documentRef, result.coverage);
    addUniversities(map, leaflet, result.universities);
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
