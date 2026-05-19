# Frontend Inventory

## Served Surface

- `app/app.js` serves `app/public/` as the web root.
- `app/public/index.html` is the current first page.
- `app/public/css/` contains the page styles.
- `app/public/js/` contains first-party browser scripts.
- `app/public/vendor/` contains vendored browser libraries.
- `app/public/data/unis.json` is the explicit demo/test fixture for offline and browser-safe map rendering.
- `app/public/Untitled/` contains Unity build artifacts that should be preserved as static assets during cleanup.

## First-Party Browser Files

- `app/public/index.html`
- `app/public/css/main.css`
- `app/public/css/reset.css`
- `app/public/js/main.js`
- `app/public/js/map.js`
- `app/public/js/map_config.js`
- `app/public/src/main.ts`
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
- `app/public/src/main.ts` owns typed layer visibility, sidebar, and layer-menu toggle behavior, then compiles to the browser-facing `app/public/js/main.js`.
- `app/public/js/main.js`, `app/public/js/map.js`, and `app/public/js/map_config.js` remain committed because they are static browser assets referenced by `app/public/index.html`.

## Map Data Flow

- The browser map prefers the same-origin modern API collection path `/v1/unis`.
- `app/app.js` proxies `/v1/*` to `UTOPLAN_API_ORIGIN` when configured.
- `app/app.js` maps `/v1/unis` to `app/public/data/unis.json` only when `UTOPLAN_DEMO_FIXTURE=1` is set.
- `app/public/src/map.ts` still has a client-side fallback URL from `MapConfig.fallbackDataUrl` for deployments where the preferred API request fails.
- `npm run start:local` starts the modern API and static app with the proxy origin wired automatically.
- `npm run docker:test:proxy` validates `npm run start:local` against the seeded modern API and confirms same-origin `/v1/unis` does not read from the offline fixture.
- `npm run docker:test:start-local-browser` validates the rendered map against the seeded `start:local` path in Chromium.

## JavaScript Ownership

- `app/app.js` remains dependency-free static-server glue.
- `app/public/js/*.js` are committed browser assets compiled from `app/public/src/*.ts`.
- `app/test/*.js` and `test/browser_smoke_test.js` are compatibility/smoke tests for the compiled browser output.
- Vendored and Unity-generated JavaScript remains isolated under `app/public/vendor/` and `app/public/Untitled/`.
