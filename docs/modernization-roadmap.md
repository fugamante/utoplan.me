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
- The first-page map now prefers the modern same-origin `/v1/unis` collection path while preserving explicit demo/test fixture fallback for standalone static app runs.
- The static app can proxy `/v1/*` to `UTOPLAN_API_ORIGIN`, which supports local two-service validation against the modern API without changing browser URLs.
- Offline fixture fallback is gated behind `UTOPLAN_DEMO_FIXTURE=1`; default static app runs no longer silently serve `/v1/unis` from fixture data.
- `npm run start:local` starts the modern API and static app together with the same-origin proxy wiring applied.
- Docker proxy validation now runs `npm run start:local` through the real modern API against seeded Postgres data.
- Browser-level Docker validation now exercises the seeded `start:local` path and verifies the rendered map uses modern API data.
- `docker-compose.integrated.yml` and `docs/deployment-topology.md` define the app/API deployment topology with the API kept behind the static app proxy.
- The integrated topology now has app/API `/healthz` endpoints, Compose health checks, CI coverage for the seeded browser smoke, and production API database configuration fail-fast.
- `docs/production-deployment.md` now defines the production operator contract for required secrets, release preflight checks, migration/seeding policy, health checks, and rollback triggers.
- `npm run verify:deployment` now validates production app/API environment configuration before startup.
- The integrated Compose topology and modern API image now run the deployment verifier before service startup.
- The modern API exposes `/readyz` for database-backed readiness while `/healthz` remains a shallow process health check.
- `/readyz` now verifies the `baseline-read-v1` database schema contract before the API is marked ready.
- `db/migrations/` and `docs/database-migrations.md` now define the migration artifact format and production release checklist.
- `db/migrations/202605211200_baseline_read_v1.md` records the existing read schema as the initial production reference.
- `docs/data-provenance.md` records the current evidence for original hackathon data sources and tracks the unresolved organizer-provided dataset provenance gap.
- `docs/data-intake.md` and `data/sources/puerto-rico.json` define the Puerto Rico-only source intake contract for future data replacement work.
- `npm run test:data-sources` validates that registered import candidates are Puerto Rico-only or explicitly filtered to Puerto Rico.
- `docs/data-schema-mapping.md` and `data/mappings/puerto-rico-schema-map.json` map Puerto Rico source candidates to the preserved legacy schema before import work.
- `npm run test:data-mapping` validates that source mappings reference registered sources and preserve legacy table columns.
- `docs/data-normalization.md` and `data/mappings/puerto-rico-normalization.json` define deterministic import normalization rules for Puerto Rico source data.
- `npm run test:data-normalization` validates that normalization rules reference registered sources and preserved legacy columns.
- `data/mappings/puerto-rico-provenance-confidence.json` defines source confidence, transform confidence, production readiness, and promotion blockers for the source-backed `cbps`, `muns`, and `unis` baseline.
- `npm run test:data-provenance-confidence` validates that provenance/confidence assessments reference registered Puerto Rico sources and keep blocked legacy tables blocked.
- The modern API exposes the provenance/confidence contract through DB-free `GET /v1/source-metadata`, while `/readyz` remains reserved for operational readiness.
- `data/mappings/puerto-rico-business-categories.json` defines the first draft BusinessCategory-to-NAICS crosswalk for planning context, and `npm run test:data-business-categories` validates it.
- `scripts/planning_context.js` and `data/fixtures/non-production/planning-context-fixture.json` prove a municipality plus business category can select source-backed CBP facts without creating scores or recommendations.
- The modern API exposes that fixture-backed read model through DB-free `GET /v1/planning/context-demo`.
- The modern API exposes the first live planning-context slice through `GET /v1/planning/context?municipality=...&category=...`, resolving municipality/category from the database and returning source-backed CBP facts with visible provenance confidence while keeping signals and scores empty.
- The seeded Docker/Postgres demo now includes a neutral `demo_sessions` table and `GET /v1/demo/session?session=demo-session-1` returns a saved local demo profile composed with live planning context.
- The static app now includes a browser-local planning profile panel backed by `localStorage`, allowing users to save a business idea, municipality id, and category id without server mutation or authentication claims.
- `docs/session-auth-contract.md` and `data/mappings/puerto-rico-session-auth-contract.json` reserve the production session/auth boundary while keeping production auth implementation blocked.
- `db/migrations/202605241000_reserve_session_profile_tables.md` reserves additive production session/profile tables without enabling endpoints or changing readiness.
- The anonymous session/profile API contract now defines gate-mounted `POST /v1/anonymous-sessions`, `GET /v1/profile`, `PUT /v1/profile`, and `DELETE /v1/profile` behavior.
- `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md` and `docs/anonymous-session-runtime-sequence.md` reserve the anonymous storage and threat-reviewed runtime sequence.
- The modern API now includes route-specific anonymous CORS/CSRF scaffolding and tests while keeping gate-disabled anonymous endpoints at `501 Not Implemented`.
- The modern API now includes anonymous token hashing/cookie helpers, transaction scaffolding, and anonymous session/profile SQL helpers wired behind the activation gate.
- The modern API now includes anonymous fixed-window rate-limit scaffolding and profile body-validation helpers wired behind the activation gate.
- `docs/product-scope.md`, `docs/demo-manual.md`, `docs/phase-summaries.md`, and `docs/test-results-ansi-ieee-829-1983.md` capture the current product boundary, demo operation path, roadmap phase summaries, and validation evidence.
- `scripts/data_normalization.js` provides fixture-backed normalization helpers for NAICS filtering, municipality code coercion, title cleanup, and university coordinate join review behavior.
- `scripts/data_import_plan.js` provides an offline fixture planning harness and CLI that reports accepted, rejected, and manual-review records without fetching source data or mutating a database.
- `scripts/data_source_cache.js` downloads only registered HTTPS Puerto Rico sources into an ignored local cache with metadata sidecars, and the offline planner can consume supported cached CSV/JSON sources by source ID while reporting unsupported cached sources explicitly.
- `scripts/data_load_plan.js` converts accepted planner records into dry-run DB-ready row groups while preserving skipped rejected/manual-review records.
- `data/mappings/puerto-rico-load-policy.json` defines the transaction, idempotency, and write-guard policy required before any future database loader can mutate data.
- `scripts/data_sql_preview.js` converts a dry-run load plan plus the load policy into parameterized PostgreSQL upsert previews without connecting to a database or enabling writes.
- `scripts/data_sql_preview_db_check.js` validates those SQL previews against disposable Docker/Postgres tables inside a rollback-only transaction and requires matching natural-key unique indexes.
- `db/migrations/202605230900_add_load_natural_key_indexes.md` documents the production migration path, duplicate preflight checks, verification SQL, and rollback SQL for the load-policy natural-key indexes.
- API `/readyz` now reports advisory `loadPolicyIndexes` and `missingLoadPolicyIndexes` metadata without changing the current `baseline-read-v1` read-only readiness gate.
- `scripts/data_writer_gate.js` blocks writer enablement unless skipped records are acknowledged, SQL previews are unblocked, and `/readyz` reports visible load-policy indexes.
- `data/mappings/puerto-rico-writer-contract.json` defines the future audited writer execution contract while keeping mutation disabled.
- `data/mappings/puerto-rico-operator-approval-contract.json` defines the skipped-record approval artifact required by the future writer contract without committing real approvals.
- `scripts/data_operator_approval_validate.js` validates operator approval artifacts against the SQL preview and writer gate without enabling mutation.
- `scripts/data_release_evidence_bundle.js` builds a local dry-run release evidence directory with plan, preview, gate, approval, validation, and manifest artifacts without mutating data.
- `data/fixtures/non-production/` contains checked-in JSON and CSV offline planning fixtures plus an expected report for repeatable local demos.
- `npm run verify:release` wraps app/API deployment verification for release jobs, and Azure validates the wrapper in sample mode without production secrets.
- `npm run verify:release-smoke` checks deployed app `/healthz`, public `/v1/unis`, public `/v1/planning/context-demo`, and optional API `/readyz` from configured release URLs. With `UTOPLAN_ANONYMOUS_SMOKE=1`, it also verifies the gate-mounted anonymous create/read/update/delete flow through the app origin.
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
- Document original data provenance before treating seeded or recovered data as production data. Status: in progress; `docs/data-provenance.md` records verified old-branch evidence, while `docs/data-intake.md`, `docs/data-schema-mapping.md`, and the `data/` registry files constrain replacement candidates to Puerto Rico-only sources and preserved schema mappings.
- Define provenance/confidence metadata before source-backed API/UI promotion. Status: in progress; `data/mappings/puerto-rico-provenance-confidence.json` classifies `cbps`, `muns`, and `unis` as source-backed candidate planning data with unresolved promotion blockers, while `cdepts`, `businesses`, and `grade_cs` remain blocked. The modern API now exposes that contract through `GET /v1/source-metadata` without depending on database readiness.
- Define the first product-level category crosswalk before a planning context endpoint. Status: started; `data/mappings/puerto-rico-business-categories.json` maps eight starter business categories to NAICS 2012 code families with assumptions, confidence, and limitations.
- Add a planning context read-model fixture before an API endpoint. Status: started; `npm run test:planning-context` validates selected municipality/category input, matched CBP facts, confidence, unresolved questions, and absence of scoring.
- Expose a demo planning context endpoint before live database reads. Status: started; `/v1/planning/context-demo` serves the fixture-backed read model without scoring or database access.
- Implement the first live planning context slice. Status: in progress; `/v1/planning/context` resolves selected municipality and category from live inputs, attaches matching source-backed CBP facts, returns no signals or scores, and keeps invalid query and missing municipality behavior pinned.
- Add a DB-backed demo session/profile slice. Status: started; `/v1/demo/session` resolves a neutral seeded session id, returns saved profile choices, composes them with live planning context, and remains read-only with no authentication or account-management claims.
- Add browser-local profile persistence. Status: started; the map page can save, load, and clear a local planning profile with no API writes, and browser smoke coverage verifies persistence across reloads.
- Define production session/auth contract. Status: started; production auth endpoints remain reserved and blocked until privacy, retention, migration, rate-limit, ownership, and audit requirements are satisfied.
- Reserve production session/profile tables. Status: started; the migration artifact defines future `user_accounts`, `user_sessions`, `planning_profiles`, and `profile_events` tables while keeping runtime behavior unchanged.
- Define anonymous session/profile API contract. Status: gate-mounted runtime contract complete; endpoint shapes, same-origin cookie ownership, route-specific CORS, CSRF checks, optimistic concurrency with caller ownership, allowed profile fields, anonymous storage artifact, runtime sequence, and failure modes are wired behind the activation gate.
- Add anonymous CORS/CSRF runtime scaffolding. Status: complete; anonymous routes avoid wildcard CORS, deny invalid preflights, require configured same-origin signals, gate post-bootstrap writes on `X-CSRF-Token` presence, and still return `501` when the activation gate is disabled or failed.
- Add anonymous data-access and token-hashing scaffolding. Status: complete; token generation, hash-only comparison, secure cookie helpers, anonymous SQL builders, row mappers, response envelope helpers, and transaction support are covered and wired behind the activation gate.
- Add anonymous rate-limit and profile body-validation scaffolding. Status: complete; process-local fixed-window limiter keys, profile body-size checks, JSON parse failures, envelope validation, allowed fields, municipality/category validation, and `businessIdea` limits are covered and wired behind the activation gate.
- Add endpoint-level reserved anonymous route contracts and production rate-limit policy. Status: complete; gate-disabled anonymous routes have explicit HTTP contract tests for `501`/`403`/`405` envelopes, CORS behavior, method allowlists, Referer fallback, and no cookie issuance. Rate-limit helper tests cover trusted client IP behavior and `Retry-After` calculation while docs keep public runtime blocked until shared/edge limiting is configured.
- Add transactional anonymous runtime composition and schema readiness gates. Status: complete; session/profile creation and profile delete/session revoke now have executor-based transaction helpers, and `anonymous-session-v1` table/index readiness is defined separately from the current disabled-route `/readyz` contract.
- Add release-gated anonymous runtime activation controls. Status: complete; anonymous runtime cannot pass activation unless explicitly requested, anonymous schema readiness is confirmed, and rate limiting is explicitly attested as edge-backed or shared, with trusted proxy identity required for shared mode.
- Add reserved-route `429` response contracts and endpoint handler composition. Status: complete; gate-disabled anonymous HTTP routes can return `429` with `Retry-After` and no cookies or `RateLimit-*` headers, while the handler-composition module pins create/read/write/delete validation, same-origin and CSRF verification for writes/deletes, injected rate-limit decisions, token/cookie use, row-version conflict handling, deleted-profile `410` handling, delete/revoke, and clear-cookie response descriptors.
- Mount anonymous create/read/write/delete behind the release activation gate. Status: complete; server wiring reads bounded bodies, checks anonymous schema readiness before success routing, avoids double rate limiting when enabled, and preserves `501` reserved behavior when the gate is disabled or failed.
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
- Add a minimal browser smoke test for the served public page. Status: complete; server-level static smoke coverage verifies the first page, key assets, local map fixture data, and browser cache-validator compatibility, while Playwright verifies API-ready, offline fallback, and no-data error map states plus base tile layer rendering, layer menu toggle, sidebar toggle, marker rendering, and clean console/page errors.
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
- Clean up API resource naming compatibility. Status: in progress; canonical `/v1/businesses` and `/v1/grade_cs` routes are now covered while legacy typo aliases `/v1/busines` and `/v1/grace_cs` remain accepted.
- Pin collection query compatibility. Status: in progress; optional `limit` and `offset` query parameters are validated, parameterized, and reflected in collection metadata while unknown query parameters remain ignored for compatibility.
- Defer filter/sort semantics until source-backed planning data is ready. Status: in progress; collection filters and sorting are explicitly unsupported and ignored until provenance/confidence metadata and dataset-to-insight mappings are defined.
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

Apply the anonymous storage and shared-limiter migration artifacts in a disposable environment, enable shared anonymous runtime config, and run the opt-in anonymous release smoke against that candidate.
