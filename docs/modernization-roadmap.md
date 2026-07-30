# Modernization Roadmap

## Current State

- `app/` is a dependency-free Node static server for the public web assets.
- `dtoapi/` serves the modern API entrypoint; obsolete Nodal source has been removed from the normal project tree.
- Root workspace scripts install, test, build, and start both services from lockfiles.
- Generated dependency folders are ignored and removed from source control.
- GitHub Actions installs Node 26, runs the contract-test baseline, and runs
  the modern Docker-backed validation surface.
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
- `docs/data-source-schema-mapping.md` now maps the registered Puerto Rico
  `cbps` and `unis` candidates to the preserved legacy read-schema columns in
  `dtoapi/modern/src/resource_contract.ts` and
  `db/migrations/202605211200_baseline_read_v1.md`.
- The Puerto Rico source registry now records machine-readable
  `legacySchemaMap` coverage and `importReadiness` blockers for active mapped
  tables so import work can distinguish accepted transforms from unresolved
  source gaps and operator decisions.
- The approved `cbps.cnaic_name` import join now uses the checked-in
  `data/naics/cbp-naics-titles.json` Census title registry for the full
  registered Puerto Rico CBP code set, so the municipality-level `cbps`
  candidate is import-ready without a live Census API key.
- The `unis` higher-ed replacement candidate now treats the approved Census
  geocoder cache, checked-in quarantine artifact, and accepted partial import
  boundary as the authoritative import gate; production-style output is limited
  to reviewed Census-cache-backed rows until coverage changes.
- The reviewed Census geocoder cache now contains 4 Puerto Rico matches from
  the 19 approved alias/campus rows, while 15 approved rows without Census
  matches and the 27 identity-quarantined rows remain excluded through the
  quarantine artifact.
- The `unis` import boundary review now records the MAX decision board in
  `data/geocoding/unis-import-boundary-review.json`: partial import from the 4
  cache-backed rows is accepted with explicit API/UI coverage language, while
  the 42 reviewed exclusions remain outside production-style output.
- The accepted partial `unis` boundary now has a reproducible generated slice:
  `node scripts/build_unis_slice.js` writes
  `data/generated/unis-partial-import.json` and
  `docker/postgres/002_unis_partial_seed.sql`, and the seeded modern DB reads
  those 4 reviewed rows instead of placeholder university data.
- The generated 4-row `unis` slice now also populates legacy `desc` from
  non-personal fields in the checked-in `data/unis/partial-source-fields.json`
  artifact, which is machine-checked to match only the accepted
  Census-cache-backed rows.
- The `unis` path now also records stronger federal corroboration candidates
  for institution identity and accreditation so real Puerto Rico institutions
  are not screened only through the current single auxiliary audit method.
- The `unis` authority stack now also registers the Puerto Rico Department of
  State ORLIE/JIP postsecondary listing as a licensure corroboration surface,
  while documenting that its public Power BI listing is not yet a verified
  stable bulk export or direct `unis` row source.
- `data/unis/albizu-staged-review.json` and
  `data/unis/sagrado-staged-review.json` record Universidad Carlos Albizu and
  Universidad del Sagrado Corazón as source-backed staged alias/campus and
  public-address evidence decisions while keeping both rows blocked before
  Census cache, coordinates, DB seed, and generated output.
- `data/geocoding/sagrado-geocoder-candidate-review.json` records read-only
  Census candidate attempts for official-source Sagrado address forms; the
  tested forms returned zero Puerto Rico matches and do not change cache,
  coordinates, DB seed, generated output, API coverage, or UI coverage.
- `docs/unis-alias-campus-match-policy.md` and
  `data/unis/ipeds-alias-campus-review.json` now define the reviewed
  alias/campus approval gate for unmatched `unis` rows so geocode-cache work
  can proceed from row-level evidence rather than prose-only operator
  decisions.
- `docs/product-scope.md` defines the current product boundary: descriptive Puerto Rico planning context before recommendations, rankings, or automated decisions.
- `docs/business-location-decision-framework.md` refocuses product sequencing
  around business operating profile, scale, and geographic reach. University
  presence is subordinate workforce evidence, not a primary location signal.
- `data/mappings/puerto-rico-business-categories.json` defines the first candidate business-category to NAICS crosswalk for source-backed planning context.
- `npm run test:data-sources` validates that registered import candidates are Puerto Rico-only or explicitly filtered to Puerto Rico.
- `npm run test:naics-registry` validates the checked-in Census title registry
  for the registered Puerto Rico CBP code set and the approved
  `cbps.cnaic_name` auxiliary join path.
- `npm run test:unis-geocode-audit` validates the checked-in higher-education
  coordinate audit so `unis` blocker state stays tied to reproducible source
  evidence.
- `npm run test:business-categories` validates the candidate category crosswalk and rejects scoring-oriented contract drift.
- `data/planning-context/mun001_construction.json` defines the first descriptive planning-context fixture for one municipality/category selection with matching CBP facts, confidence labels, and unresolved questions.
- `data/planning-context/mun003_restaurant.json` adds a second descriptive planning-context fixture for a different municipality/category slice so confidence and unresolved-question patterns can be compared.
- `data/municipalities/planning-context-municipalities.json` now records source-backed municipality display names for the active planning-context fixture set using the official Puerto Rico municipality boundary dataset from Datos.PR.
- `npm run test:planning-context` validates the planning-context fixture contract and blocks scoring-oriented drift.
- The modern API now serves read-only planning-context summaries at `GET /v1/planning-context` and fixture detail at `GET /v1/planning-context/:id`, with explicit descriptive-only guardrails in each response.
- The first page now reads `GET /v1/planning-context` and renders descriptive municipality/category planning-context options without score/ranking/recommendation language.
- The first page now requests `GET /v1/planning-context/:id` for the selected planning-context option and surfaces descriptive confidence, limitation, and unresolved-question detail in the same panel.
- Planning-context summary/detail labels for the active fixture set now resolve against the source-backed municipality registry instead of placeholder `Municipality code ###` strings.
- The first-page planning-context detail panel now renders disclosure-limited CBP values as masked and rounded/noise-flagged CBP values as approximate so the UI does not imply false precision from `D`/`H` source flags.
- Planning-context CBP facts for the active fixture set now resolve deterministic source-backed `naicsTitle` labels from a Census-backed registry, and the first-page detail panel renders those labels instead of code-only fact headers.
- The planning-context detail API now derives a `sourceProvenance` view from
  fixture `sourceMetadata`, and the first-page detail panel renders source
  publisher, portal, source id, and retrieval date so limitations and facts are
  visibly tied to registered source evidence.
- The first-page planning-context list and detail now also surface each
  fixture's candidate-review status, update date, and registered-source count,
  while the `unis` header renders both the accepted partial-coverage label and
  its first explicit limitation so incomplete reviewed coverage is harder to
  misread as full readiness.
- `docs/production-readiness-decision-board.md` records the MAX decision to
  keep the accepted partial `unis` boundary unchanged while making partial
  coverage and candidate-grade planning-context state more explicit in the
  API/UI surface.
- `data/profile-reach/business-profile-reach-v1.json` now defines the first
  versioned business-profile and geographic-reach contract, holding
  `mun003_restaurant` constant across small/local, medium/regional, and
  large/strategic scenarios so profile-dependent lens relevance, criticality,
  reach, confidence, limitations, and next validation checks are explicit
  without scores, ranks, or recommendations.
- `data/profile-reach/decision-signal-registry-v1.json` now defines the first
  decision-signal registry for the seven documented lenses, records which
  matrix facts are backed by registered Puerto Rico evidence versus controlled
  source gaps, and pins applicable scenarios, geographic reach, recency, and
  interpretation limits before any profile-dependent API/UI expansion.
- `data/profile-reach/aguada-restaurant-permit-path-review.json` now records
  the first source-backed decision-signal upgrade: official Puerto Rico OGPe,
  Fire Bureau, Department of Health, and municipal-patent authorities now
  establish a descriptive permit path for the fixed Aguada restaurant
  scenario, while timing, parcel eligibility, and case outcome remain explicit
  limits.
- `data/profile-reach/aguada-restaurant-utility-service-review.json` now
  records the first infrastructure decision-signal upgrade: official Puerto
  Rico electricity-rate governance, outage-reporting guidance, and Aguada
  water-service interruption evidence now establish a descriptive utility
  continuity baseline for the fixed restaurant scenario, while parcel-level
  reliability, outage duration, and spoilage risk remain explicit limits.
- `data/profile-reach/aguada-restaurant-site-screening-review.json` now
  records the first site-feasibility decision-signal upgrade: official Puerto
  Rico Planning Board zoning, flood, district, and Aguada hazard sources now
  establish a descriptive site-screening baseline for the fixed restaurant
  scenario, while parcel readiness, kitchen retrofit condition, frontage, and
  lease fit remain explicit limits.
- `data/profile-reach/aguada-restaurant-large-site-screening-review.json` now
  records the next site-feasibility decision-signal upgrade: official Aguada
  territorial-plan, Puerto Rico Planning Board zoning, flood, district, and
  hazard sources now establish a descriptive large-site screening baseline for
  the fixed large-strategic restaurant scenario, while parcel assembly,
  parking, truck access, structure condition, and utility staging remain
  explicit limits.
- `data/profile-reach/aguada-restaurant-workforce-pipeline-review.json` now
  records the first workforce decision-signal upgrade for the fixed strategic
  restaurant scenario: official Puerto Rico labor-market publications now
  establish island-wide food-service supervision, staffing-volume, annual-
  openings, and growth context, while Aguada-specific hiring depth, retention,
  commute range, and one-operator staffing resilience remain explicit limits.
- `npm run test:decision-signals` validates the decision-signal registry and
  its linkage back to the profile/reach matrix so fixed-selection planning
  facts cannot drift away from their documented evidence or explicit gap state.
- `npm run test:regulatory-signal-review` validates the reviewed Aguada
  restaurant permit-path artifact and its linkage to the source registry and
  decision-signal contract.
- `npm run test:infrastructure-signal-review` validates the reviewed Aguada
  restaurant utility-service artifact and its linkage to the source registry
  and decision-signal contract.
- `npm run test:site-feasibility-signal-review` validates the reviewed Aguada
  restaurant site-screening artifact and its linkage to the source registry
  and decision-signal contract.
- `npm run test:large-site-signal-review` validates the reviewed Aguada
  restaurant large-site screening artifact and its linkage to the source
  registry and decision-signal contract.
- `npm run test:workforce-signal-review` validates the reviewed Aguada
  restaurant workforce artifact and its linkage to the source registry and
  decision-signal contract.
- `npm run test:profile-reach-contract` validates the profile/reach contract,
  the three-scenario matrix, the fixed municipality/category boundary, and the
  expected profile-dependent reach and criticality progression.
- `npm run test:browser:start-local` now validates the host-native integrated
  `start:local` path against a seeded `baseline-read-v1` database, including
  same-origin planning-context summary/detail requests, rendered descriptive
  detail, and fixture exclusion.
- `npm run verify:release` wraps app/API deployment verification for release
  jobs, and GitHub Actions validates the wrapper in sample mode without
  production secrets.
- `npm run verify:release-smoke` checks deployed app `/healthz`, public
  `/v1/unis`, public `/v1/planning-context`, and optional API `/readyz` from
  configured release URLs.
- The authoritative npm security gate is the current Node lockfile-backed audit across root, `app`, `dtoapi`, and `dtoapi/modern`, which currently reports zero vulnerabilities.
- `docs/standards/` now defines the active IEEE 730, 828, 829, 830, 1016, 1012, and 1058 standards corpus, with paired audit guides for keeping quality, configuration, test, requirements, design, V&V, and project-management controls current during ongoing modernization.

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
- Document original data provenance before treating seeded or recovered data as production data. Status: in progress; `docs/data-provenance.md` records verified old-branch evidence, while `docs/data-intake.md` and `data/sources/puerto-rico.json` constrain replacement candidates to Puerto Rico-only sources.
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

Continue replacing the highest-risk source-gap signals in the fixed-selection
matrix with registered Puerto Rico evidence. After the new workforce baseline,
the next best lane is demand or logistics, provided a bounded official Puerto
Rico mobility or market proxy can be pinned without inventing municipality-
specific precision. Keep category and place constant while upgrading
`data/profile-reach/business-profile-reach-v1.json` from explicit gap control
toward source-backed signals for demand, logistics, resilience, and the
remaining workforce gaps.

Treat the current 4-row generated `unis` slice and its review artifacts as a
maintenance boundary, not the next product lane. Do not spend the next pass on
additional university identity or geocoding promotion unless a concrete
occupation-to-skill or training-capacity question requires it. Preserve the
existing university provenance, quarantine, API coverage language, and tests
while product effort shifts to business-critical evidence.
