# Modernization Roadmap

## Current State

- `app/` is a dependency-free Node static server for the public web assets.
- `dtoapi/` serves the modern API entrypoint; obsolete Nodal source has been removed from the normal project tree.
- Root workspace scripts install, test, build, and start both services from lockfiles.
- Generated dependency folders are ignored and removed from source control.
- Azure Pipelines installs Node 22, runs the DB-free API contract baseline, and runs the modern DB-backed contract suite through Docker Compose.
- Docker validation builds from lockfiles, runs the API test baseline, and serves the static app by default.
- Docker DB validation builds a seeded Postgres test image instead of bind-mounting seed SQL, avoiding host file-sharing instability during database initialization.
- DB-backed API contracts run in a current Node container against the modern API, including missing-record behavior.
- The first-page map now prefers the modern same-origin `/v1/unis` collection path while preserving local fixture fallback for standalone static app runs.
- The static app can proxy `/v1/*` to `UTOPLAN_API_ORIGIN`, which supports local two-service validation against the modern API without changing browser URLs.
- The authoritative npm security gate is the current Node lockfile-backed audit across root, `app`, `dtoapi`, and `dtoapi/modern`, which currently reports zero vulnerabilities.

## Target Outcomes

- A reproducible install/test/start workflow from the repository root.
- No generated dependency trees committed to source control.
- Clear separation between legacy compatibility work and framework replacement work.
- Tests that can run in a documented Node runtime before any large rewrite.
- A future TypeScript migration path after behavior is covered.
- WebAssembly treated as a reactive implementation option only for measured CPU-bound hotspots.

## Phases

### Phase 1: Baseline And Hygiene

- Add root workspace scripts for build, test, and service startup.
- Ignore generated dependency folders and debug logs.
- Fix broken package metadata that blocks normal commands.
- Capture the current test baseline and runtime mismatch.

Exit criteria:

- `npm run build` has a defined behavior at the repository root.
- `npm --prefix app start` starts the static server on a configurable port.
- Existing API tests either pass or fail with a documented compatibility reason.

### Phase 2: Dependency Reproducibility

- Remove committed `node_modules` trees in a dedicated cleanup commit. Status: complete.
- Generate lockfiles under a selected Node runtime. Status: complete.
- Decide whether the compatibility target is Node 8 for archival stability or current LTS for active maintenance. Status: complete; use modern Node CI and preserve legacy API behavior through modern compatibility tests.
- Move secrets out of committed JSON config and replace them with documented environment defaults. Status: complete.

Exit criteria:

- Fresh clone plus install can reproduce the same dependency graph.
- No secrets or generated dependencies are tracked.
- CI runs install and tests from a clean checkout.
- Docker build runs install and tests from a clean build context.

### Phase 3: API Compatibility

- Stabilize the legacy API test suite under the selected compatibility runtime. Status: complete; behavior was captured before the Nodal runtime was removed from the normal dependency graph.
- Add smoke tests for the public read endpoints. Status: complete; database-free root, route, CORS, gzip behavior, and seeded DB endpoints are covered.
- Document database requirements and seed/reset steps. Status: complete; Docker Compose provides a disposable Postgres test database with deterministic seed data.
- Record runtime compatibility constraints. Status: complete; the Node 8/Nodal compatibility path has been retired after seeded DB read behavior moved to the modern API.
- Isolate externally observable endpoint behavior before replacement. Status: complete via API contract tests.

Exit criteria:

- API tests run in CI.
- Endpoint behavior is captured before any framework migration.
- Database setup is repeatable.

### Phase 4: Frontend Static App

- Inventory duplicated frontend files under `app/` and `app/public/`. Status: complete; stale duplicate files have been removed.
- Preserve static Unity/Leaflet artifacts while separating first-party JavaScript. Status: complete; vendored browser libraries live under `app/public/vendor/`.
- Replace ad hoc browser globals only after the existing map/data behavior is covered. Status: complete for the first page; UI behavior has moved out of inline jQuery, map/data helpers are scoped inside first-party script modules, and first-party behavior is wired through explicit `data-ui` / `data-map` hooks.
- Extract small frontend configuration/data adapter boundaries before framework work. Status: complete; `js/map_config.js` owns first-page map defaults, tile provider defaults, data URL selection, and university record normalization.
- Add a minimal browser smoke test for the served public page. Status: complete; server-level static smoke coverage verifies the first page, key assets, local map fixture data, and browser cache-validator compatibility, while Playwright verifies map load, base tile layer rendering, layer menu toggle, sidebar toggle, marker rendering, and clean console/page errors.
- Remove legacy static-server npm vulnerabilities. Status: complete; `app/` now serves static assets through Node built-ins and has no production npm dependencies.

Exit criteria:

- First-party frontend files are identifiable and tested at the page-load level.
- Static assets are served without relying on committed dependency folders.

### Phase 5: Framework Replacement

- Choose the API target only after Phase 3 behavior is pinned. Status: complete; use the current Node runtime as the replacement target, keep the first slice dependency-free, and defer framework selection until more endpoints expose routing/database needs.
- Prefer a TypeScript-capable Node runtime for replacement work so endpoint contracts and data boundaries can be typed incrementally.
- Migrate endpoint by endpoint with compatibility tests. Status: in progress; the DB-free root endpoint and seeded DB-backed read endpoints are available through `dtoapi/modern/src/server.ts` with matching success and edge-behavior tests.
- Isolate modern dependencies from legacy source. Status: complete; normal installation no longer installs Nodal, and modern Postgres access uses `dtoapi/modern/package.json`.
- Reduce legacy API audit exposure while replacement proceeds. Status: complete; Nodal, Mocha, and Chai have been removed from the normal API dependency graph.
- Harden modern API failure responses. Status: in progress; unsupported methods on known record routes now return explicit `405` responses, and raw database errors are logged server-side instead of exposed in response bodies.
- Prepare TypeScript-ready response boundaries. Status: complete; `dtoapi/modern/src/response_contract.ts` now owns the typed shared response envelope, error envelope, and JSON serialization contract.
- Prepare TypeScript-ready resource boundaries. Status: complete; `dtoapi/modern/src/resource_contract.ts` now owns typed resource definitions, public column order, row serialization, and parameterized read-query construction.
- Keep data schema and response contracts stable unless a breaking change is explicitly accepted.

Exit criteria:

- New runtime passes the preserved API contract tests.
- Legacy Nodal runtime can be removed without losing documented behavior. Status: complete for the seeded read contract set.

### Phase 6: TypeScript Adoption

- Introduce TypeScript after API and frontend behavior have contract coverage. Status: started in `dtoapi/modern`.
- Start at boundaries: config loading, API response shapes, frontend data adapters, and map modules. Status: in progress; the modern API response and resource contracts are now typed and compile to ignored CommonJS output.
- Migrate modern API data lookup boundary. Status: in progress; `dtoapi/modern/src/records.ts` now owns typed record payload wrapping and typed callback results.
- Migrate modern API database boundary. Status: complete; `dtoapi/modern/src/db.ts` now owns typed environment-derived connection config, query callbacks, and pool close lifecycle.
- Migrate modern API root contract. Status: complete; `dtoapi/modern/src/root_contract.ts` now owns the typed root endpoint payload and serialization contract.
- Migrate modern API HTTP runtime. Status: complete; `dtoapi/modern/src/server.ts` now owns typed routing, gzip detection, CORS headers, response dispatch, and server startup.
- Migrate frontend map/data boundary. Status: in progress; `app/public/src/map_config.ts` owns typed map defaults, runtime override selection, and university record normalization while `app/public/src/map.ts` owns typed map creation, university loading, marker rendering, and DOM startup. Both compile to the existing browser module paths.
- Migrate frontend UI toggle boundary. Status: complete; `app/public/src/main.ts` now owns typed layer visibility, sidebar, and layer-menu toggle behavior while compiling to the existing browser module path.
- Inventory remaining JavaScript ownership. Status: complete; remaining handwritten JavaScript is static-server glue or test/smoke coverage, generated browser JavaScript is compiled from TypeScript, and vendored/generated assets are isolated.
- Keep JavaScript compatibility layers small and temporary.
- Avoid broad rewrites that mix typing, framework replacement, and behavior changes in one step.

Exit criteria:

- Shared public contracts are typed.
- New or migrated modules compile under TypeScript.
- Remaining JavaScript files have explicit ownership and migration notes.
Status: complete for active API runtime and first-party browser behavior. Tests/tooling may remain JavaScript unless a future pass needs stronger typed test helpers.

### Reactive Option: WebAssembly

- Do not adopt WebAssembly as a rewrite target.
- Reconsider WASM only if profiling identifies a CPU-bound hotspot such as geometry processing, large local transforms, simulation, compression, or parsing.
- Require a measurable performance target and a JavaScript fallback before introducing a WASM build path.

## Immediate Next Step

Continue the product-facing modernization phase by validating the proxy flow against a seeded local modern API, then narrowing the offline fixture fallback to explicit demo/test mode if the integrated path is stable.
