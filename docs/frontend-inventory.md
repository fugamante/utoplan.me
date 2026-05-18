# Frontend Inventory

## Served Surface

- `app/app.js` serves `app/public/` as the web root.
- `app/public/index.html` is the current first page.
- `app/public/css/` contains the page styles.
- `app/public/js/` contains first-party browser scripts.
- `app/public/vendor/` contains vendored browser libraries.
- `app/public/data/unis.json` is the local default data fixture for offline and browser-safe map rendering.
- `app/public/Untitled/` contains Unity build artifacts that should be preserved as static assets during cleanup.

## First-Party Browser Files

- `app/public/index.html`
- `app/public/css/main.css`
- `app/public/css/reset.css`
- `app/public/js/main.js`
- `app/public/js/map.js`
- `app/public/data/unis.json`

## Vendored Or Generated Assets

- `app/public/vendor/jquery/jquery.min.js`
- `app/public/vendor/leaflet/`
- `app/public/vendor/require/require.js`
- `app/public/vendor/xml2json/xml2json.js`
- `app/public/Untitled/`
- `app/public/original_art/`

## Removed Duplicate Or Stale Files

- `app/index.html` was not served by `app/app.js` and was older than `app/public/index.html`.
- `app/js/main.js`, `app/js/require.js`, and `app/js/xml2json.js` were not served by `app/app.js`; preserved vendored copies now live under `app/public/vendor/`.
- `app/public/index.js` and `app/public/server.js` were not referenced by `app/public/index.html`.

## Phase 4 Cleanup Order

1. Keep the served `app/public/` tree stable while adding smoke coverage. Status: complete.
2. Compare duplicate top-level files against served files before deleting anything. Status: complete.
3. Separate first-party scripts from vendored browser libraries. Status: complete.
4. Add browser-level coverage around map load, layer menu toggle, and sidebar toggle before behavior changes. Status: complete.
5. Move first-page UI behavior out of inline jQuery and keep first-party scripts module-scoped. Status: in progress; `index.html` now loads only first-party scripts for the first page, `js/main.js` owns panel/layer toggles, and `js/map.js` keeps map/data helpers inside an IIFE.
