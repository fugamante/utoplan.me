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
- `app/public/js/map_config.js`
- `app/public/src/map.ts`
- `app/public/src/map_config.ts`
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
5. Move first-page UI behavior out of inline jQuery and keep first-party scripts module-scoped. Status: complete; `index.html` now loads only first-party scripts for the first page, `js/main.js` owns panel/layer toggles, and `js/map.js` keeps map/data helpers inside an IIFE.
6. Prefer explicit `data-ui` and `data-map` hooks for first-party behavior and smoke coverage. Status: complete; IDs and classes remain for CSS/backward compatibility, while JavaScript and browser smoke tests use data attributes.
7. Extract frontend map configuration and data normalization behind a small first-party module. Status: complete; `public/src/map_config.ts` owns typed map defaults, OpenStreetMap tile defaults, endpoint selection, and university record normalization, then compiles to the browser-facing `public/js/map_config.js` consumed by `js/map.js`.

## TypeScript Boundary

- `app/tsconfig.json` compiles typed browser boundary modules from `app/public/src/` into the served `app/public/js/` tree.
- `app/test/map_config_contract_test.js` verifies the compiled map config module without changing the app package to ESM.
- `app/public/src/map.ts` owns typed map creation, university loading, marker rendering, and DOM startup, then compiles to the browser-facing `app/public/js/map.js`.
- `app/public/js/map.js` and `app/public/js/map_config.js` remain committed because they are static browser assets referenced by `app/public/index.html`.
