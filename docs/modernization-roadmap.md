# Modernization Roadmap

## Current State

- `app/` is a small Express 3 static server for the public web assets.
- `dtoapi/` is a Nodal 0.12 API with Mocha/Chai tests and JSON config.
- Root workspace scripts install, test, build, and start both services from lockfiles.
- Generated dependency folders are ignored and removed from source control.
- Azure Pipelines installs Node 22, runs the DB-free API contract baseline, and runs the DB-backed contract suite through Docker Compose.
- Docker validation builds from lockfiles, runs the API test baseline, and serves the static app by default.
- DB-backed API contracts run in a Node 8 compatibility container because Nodal's `pg@4.5.7` client hangs against Postgres from modern Node runtimes.

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
- Decide whether the compatibility target is Node 8 for archival stability or current LTS for active maintenance. Status: complete; use modern Node CI while preserving legacy API behavior with tests.
- Move secrets out of committed JSON config and replace them with documented environment defaults. Status: complete.

Exit criteria:

- Fresh clone plus install can reproduce the same dependency graph.
- No secrets or generated dependencies are tracked.
- CI runs install and tests from a clean checkout.
- Docker build runs install and tests from a clean build context.

### Phase 3: API Compatibility

- Stabilize the Nodal test suite under the selected compatibility runtime. Status: complete.
- Add smoke tests for the public read endpoints. Status: complete; database-free root, route, CORS, gzip behavior, and seeded DB endpoints are covered.
- Document database requirements and seed/reset steps. Status: complete; Docker Compose provides a disposable Postgres test database with deterministic seed data.
- Record runtime compatibility constraints. Status: complete; DB contracts use Node 8 because Nodal's `pg@4.5.7` client hangs from modern Node runtimes.
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

Exit criteria:

- First-party frontend files are identifiable and tested at the page-load level.
- Static assets are served without relying on committed dependency folders.

### Phase 5: Framework Replacement

- Choose the API target only after Phase 3 behavior is pinned. Status: complete; use the current Node runtime as the replacement target, keep the first slice dependency-free, and defer framework selection until more endpoints expose routing/database needs.
- Prefer a TypeScript-capable Node runtime for replacement work so endpoint contracts and data boundaries can be typed incrementally.
- Migrate endpoint by endpoint with compatibility tests. Status: in progress; the DB-free root endpoint and DB-backed `GET /v1/unis/{id}` endpoint are available through `dtoapi/modern/server.js` with matching compatibility tests.
- Isolate modern dependencies from the legacy Node 8 Nodal runtime. Status: in progress; modern Postgres access uses `dtoapi/modern/package.json` and a separate Node 22 Docker contract service.
- Keep data schema and response contracts stable unless a breaking change is explicitly accepted.

Exit criteria:

- New runtime passes the preserved API contract tests.
- Legacy Nodal runtime can be removed without losing documented behavior.

### Phase 6: TypeScript Adoption

- Introduce TypeScript after API and frontend behavior have contract coverage.
- Start at boundaries: config loading, API response shapes, frontend data adapters, and map modules.
- Keep JavaScript compatibility layers small and temporary.
- Avoid broad rewrites that mix typing, framework replacement, and behavior changes in one step.

Exit criteria:

- Shared public contracts are typed.
- New or migrated modules compile under TypeScript.
- Remaining JavaScript files have explicit ownership and migration notes.

### Reactive Option: WebAssembly

- Do not adopt WebAssembly as a rewrite target.
- Reconsider WASM only if profiling identifies a CPU-bound hotspot such as geometry processing, large local transforms, simulation, compression, or parsing.
- Require a measurable performance target and a JavaScript fallback before introducing a WASM build path.

## Immediate Next Step

Continue Phase 5 by migrating the next simple DB-backed read endpoint behind the preserved contract tests, starting with `/v1/muns/{id}` because it has deterministic Docker seed data and should reuse the modern API database boundary established by `/v1/unis/{id}`.
