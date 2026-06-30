export const DEFAULT_MAP_CONFIG = {
    center: [18.4110494, -66.0985525],
    zoom: 8,
    dataUrl: "/v1/unis",
    fallbackDataUrl: "/data/unis.json",
    tileAttribution: "&copy; OpenStreetMap contributors",
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
};
export function readMapConfig(source) {
    return {
        center: DEFAULT_MAP_CONFIG.center,
        zoom: DEFAULT_MAP_CONFIG.zoom,
        dataUrl: source.UTOPLAN_API_URL || DEFAULT_MAP_CONFIG.dataUrl,
        fallbackDataUrl: source.UTOPLAN_FALLBACK_DATA_URL || DEFAULT_MAP_CONFIG.fallbackDataUrl,
        tileAttribution: source.UTOPLAN_TILE_ATTRIBUTION || DEFAULT_MAP_CONFIG.tileAttribution,
        tileUrl: source.UTOPLAN_TILE_URL || DEFAULT_MAP_CONFIG.tileUrl
    };
}
export function normalizeUniversity(university) {
    return {
        title: university.title || "",
        position: [Number(university.lat), Number(university.long)]
    };
}
export function normalizeUniversities(payload) {
    return (payload.data || []).map(normalizeUniversity);
}
export function normalizeUniversityCoverage(payload) {
    const coverage = payload.meta ? payload.meta.coverage : null;
    if (!coverage ||
        coverage.status !== "partial" ||
        typeof coverage.coverageLabel !== "string" ||
        typeof coverage.reviewedCacheRows !== "number" ||
        typeof coverage.excludedRows !== "number" ||
        !Array.isArray(coverage.limitations) ||
        typeof coverage.limitations[0] !== "string") {
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
