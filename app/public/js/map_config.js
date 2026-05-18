export var DEFAULT_MAP_CONFIG = {
  center: [18.4110494, -66.0985525],
  zoom: 8,
  dataUrl: "/data/unis.json"
};

export function readMapConfig(window) {
  return {
    center: DEFAULT_MAP_CONFIG.center,
    zoom: DEFAULT_MAP_CONFIG.zoom,
    dataUrl: window.UTOPLAN_API_URL || DEFAULT_MAP_CONFIG.dataUrl,
    tileUrl: window.UTOPLAN_TILE_URL || ""
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
