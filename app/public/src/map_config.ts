export interface MapConfig {
  center: [number, number];
  zoom: number;
  dataUrl: string;
  fallbackDataUrl: string;
  tileAttribution: string;
  tileUrl: string;
}

export interface UtoplanWindow {
  UTOPLAN_API_URL?: string;
  UTOPLAN_FALLBACK_DATA_URL?: string;
  UTOPLAN_TILE_ATTRIBUTION?: string;
  UTOPLAN_TILE_URL?: string;
}

export interface UniversityPayload {
  meta?: {
    coverage?: UniversityCoverage;
  };
  data?: UniversityRecord[];
}

export interface UniversityCoverage {
  status?: string;
  coverageLabel?: string;
  reviewedCacheRows?: number;
  excludedRows?: number;
  limitations?: string[];
}

export interface UniversityRecord {
  title?: string;
  lat?: number | string;
  long?: number | string;
}

export interface NormalizedUniversity {
  title: string;
  position: [number, number];
}

export interface NormalizedUniversityCoverage {
  status: "partial";
  label: string;
  reviewedCacheRows: number;
  excludedRows: number;
  limitation: string;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: [18.4110494, -66.0985525],
  zoom: 8,
  dataUrl: "/v1/unis",
  fallbackDataUrl: "/data/unis.json",
  tileAttribution: "&copy; OpenStreetMap contributors",
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
};

export function readMapConfig(source: UtoplanWindow): MapConfig {
  return {
    center: DEFAULT_MAP_CONFIG.center,
    zoom: DEFAULT_MAP_CONFIG.zoom,
    dataUrl: source.UTOPLAN_API_URL || DEFAULT_MAP_CONFIG.dataUrl,
    fallbackDataUrl: source.UTOPLAN_FALLBACK_DATA_URL || DEFAULT_MAP_CONFIG.fallbackDataUrl,
    tileAttribution: source.UTOPLAN_TILE_ATTRIBUTION || DEFAULT_MAP_CONFIG.tileAttribution,
    tileUrl: source.UTOPLAN_TILE_URL || DEFAULT_MAP_CONFIG.tileUrl
  };
}

export function normalizeUniversity(university: UniversityRecord): NormalizedUniversity {
  return {
    title: university.title || "",
    position: [Number(university.lat), Number(university.long)]
  };
}

export function normalizeUniversities(payload: UniversityPayload): NormalizedUniversity[] {
  return (payload.data || []).map(normalizeUniversity);
}

export function normalizeUniversityCoverage(payload: UniversityPayload): NormalizedUniversityCoverage | null {
  const coverage = payload.meta ? payload.meta.coverage : null;

  if (
    !coverage ||
    coverage.status !== "partial" ||
    typeof coverage.coverageLabel !== "string" ||
    typeof coverage.reviewedCacheRows !== "number" ||
    typeof coverage.excludedRows !== "number" ||
    !Array.isArray(coverage.limitations) ||
    typeof coverage.limitations[0] !== "string"
  ) {
    return null;
  }

  return {
    status: "partial",
    label: coverage.coverageLabel,
    reviewedCacheRows: coverage.reviewedCacheRows,
    excludedRows: coverage.excludedRows,
    limitation: coverage.limitations[0]
  };
}
