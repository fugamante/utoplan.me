# IEEE 1016 Software Design Description

## 1. Purpose

This Software Design Description defines the current and intended design of the
`utoplan.Me` modernization fork. It is written for maintainers, reviewers,
release operators, and future implementers who need a practical reference for
how the static app, modern API, PostgreSQL data path, deployment topology, and
documentation controls fit together.

The document follows the spirit of IEEE 1016 while staying operational: design
statements here should be specific enough to guide code changes, reviews,
testing, deployment decisions, and future audits.

## 2. Scope

This design covers:

- The map-first static web application under `app/`.
- The modern TypeScript API under `dtoapi/modern`.
- Same-origin browser access to `/v1/*` through the app proxy.
- PostgreSQL-backed read data for preserved compatibility endpoints.
- Puerto Rico-only data source intake and provenance constraints.
- Docker and production deployment topology.
- Interfaces, constraints, design decisions, and evolution rules.

Out of scope unless explicitly revived:

- The retired Nodal API runtime.
- Startup-time production schema mutation.
- Unscoped non-Puerto Rico data import.
- Framework rewrites that are not backed by measured design need.

## 3. References

- `README.md`
- `docs/api-modernization.md`
- `docs/database-migrations.md`
- `docs/data-intake.md`
- `docs/data-provenance.md`
- `docs/data-source-schema-mapping.md`
- `docs/deployment-topology.md`
- `docs/frontend-inventory.md`
- `docs/modernization-roadmap.md`
- `docs/product-scope.md`
- `docs/production-deployment.md`
- `data/mappings/puerto-rico-business-categories.json`
- `data/municipalities/planning-context-municipalities.json`
- `data/planning-context/`
- `db/migrations/202605211200_baseline_read_v1.md`
- IEEE 1016, Software Design Description structure.

## 4. Design Context

`utoplan.Me` is a Puerto Rico business formation planning and decision-support
tool. The modernization fork preserves the original hackathon concept while
rebuilding the implementation into a reproducible, testable, deployable
foundation.

The product design is spatial and evidence-driven. Users should be able to
evaluate location-specific business conditions through a map-first interface
that can correlate universities, municipalities, workforce, zoning,
infrastructure, business density, industry patterns, and other local resources
as the data model matures.

The current implementation is intentionally conservative:

- Keep the browser app simple and static.
- Keep the API compatibility layer typed and small.
- Keep the API private behind the app service in integrated deployments.
- Keep production data separate from fixtures and test seeds.
- Add frameworks only when routing, validation, or domain complexity justifies
  the dependency.

## 5. Architectural Overview

### 5.1 System View

```text
Browser
  |
  | HTTPS public origin
  v
app service
  - serves app/public static assets
  - proxies same-origin /v1/* when UTOPLAN_API_ORIGIN is configured
  - exposes /healthz
  |
  | private service network
  v
api service
  - runs dtoapi/modern TypeScript output
  - serves compatibility API responses
  - exposes /healthz and /readyz
  |
  | PostgreSQL protocol
  v
PostgreSQL
  - baseline-read-v1 schema
  - production data managed outside app startup
```

### 5.2 Primary Components

| Component | Location | Design responsibility |
| --- | --- | --- |
| Static app server | `app/app.js` | Serve static assets, gate fixture mode, proxy `/v1/*`, expose app health. |
| Browser UI | `app/public/index.html`, `app/public/css/`, `app/public/src/` | Render the first-page map, UI toggles, and data-backed markers. |
| Browser compiled assets | `app/public/js/` | Committed JavaScript produced from first-party TypeScript for static serving. |
| Vendored browser assets | `app/public/vendor/`, `app/public/Untitled/` | Preserve Leaflet, Unity artifacts, and other current external/static assets. |
| Modern API runtime | `dtoapi/modern/src/server.ts` | Own HTTP routing, CORS, gzip handling, method handling, health, readiness, and response dispatch. |
| Planning-context API module | `dtoapi/modern/src/planning_context.ts` | Own planning-context fixture discovery, descriptive guardrail checks, and read-only summary/detail shaping. |
| API response contracts | `dtoapi/modern/src/response_contract.ts`, `root_contract.ts`, `records.ts` | Own typed public response shapes and compatibility wrapping. |
| API resource contract | `dtoapi/modern/src/resource_contract.ts` | Own public column order, resource definitions, row serialization, and parameterized read query construction. |
| API database boundary | `dtoapi/modern/src/db.ts` | Own PostgreSQL configuration, pool lifecycle, and query callback contract. |
| Readiness schema contract | `dtoapi/modern/src/schema_contract.ts` | Verify `baseline-read-v1` before the API is considered ready. |
| Database artifacts | `db/migrations/` | Record explicit production schema/data changes, verification, and rollback. |
| Data source registry | `data/sources/puerto-rico.json` | Record approved Puerto Rico-scoped source candidates before imports. |
| Business category mapping | `data/mappings/puerto-rico-business-categories.json` | Record candidate category-to-NAICS mappings that planning-context fixtures may reference without turning them into scores or recommendations. |
| Municipality display-name registry | `data/municipalities/planning-context-municipalities.json` | Record source-backed municipality labels for the active planning-context fixture set. |
| Planning-context fixtures | `data/planning-context/` | Record descriptive municipality/category slices with confidence, limitations, and unresolved questions. |
| Release scripts | `scripts/`, `test/` | Verify deployment configuration, release smoke behavior, and integration contracts. |

### 5.3 Runtime Modes

| Mode | App data behavior | Intended use |
| --- | --- | --- |
| Integrated proxy | Browser requests `/v1/*`; app proxies to `UTOPLAN_API_ORIGIN`; API reads PostgreSQL. | Local integrated validation, Docker validation, production. |
| Explicit fixture | `UTOPLAN_DEMO_FIXTURE=1` maps `/v1/unis` to `app/public/data/unis.json`. | Offline demos and tests only. |
| Static-only without fixture | Static assets are served; `/v1/*` is not handled by the app. | Asset-level local inspection where data is not required. |

Production must use integrated proxy mode and must not enable fixture mode.

## 6. Data Design

### 6.1 Data Scope

Puerto Rico is the active data scope. New production-style sources must be
registered in `data/sources/puerto-rico.json` before import work begins.

Each source record must capture:

- Publisher and portal.
- License.
- Source URL and resource or API URL.
- Puerto Rico-only scope or deterministic Puerto Rico filter.
- Target legacy table or endpoint.
- Candidate status and source-basis note.
- Registry retrieval date as an ISO `YYYY-MM-DD` string.
- Full preserved-column legacy-source-to-target coverage for active mapped
  tables (`cbps`, `unis`) using `legacySchemaMap` in the registry, with notes
  for every non-exact mapping.
- Approved `legacySchemaMap.columnStrategies` for preserved columns that are
  absent from the primary source but resolved through deterministic
  source-backed auxiliary joins.
- Import-readiness status and explicit blockers for active mapped tables when
  unresolved transforms, source gaps, or operator dependencies still block
  production-style import.
- Machine-readable `legacySchemaMap.evidenceDate` and
  `importReadiness.reviewedAt` values as ISO `YYYY-MM-DD` strings.
- Geocoded `unis` review control must identify the alias/campus policy
  document and the checked-in row-level decision artifact used before
  unmatched rows move beyond the exact-match baseline.
- When the `unis` import path is blocked on stronger institution authority,
  the registry must also retain Puerto Rico-filtered NCES identity and U.S.
  Department of Education accreditation corroboration entries and keep them
  documented as review-only support rather than direct row-import sources.

Broad national datasets are acceptable only when the registry records the
Puerto Rico filter and the import implementation enforces it.

Field-level mapping evidence for the active mapped tables is documented in
`docs/data-source-schema-mapping.md`.

### 6.2 Database Baseline

The current API expects the `baseline-read-v1` schema. This baseline covers the
public read tables and columns used by `dtoapi/modern/src/resource_contract.ts`.

The API `/readyz` endpoint verifies:

- Database reachability.
- Required read tables.
- Required read columns.
- Compatibility with the current read contract.

Schema changes are release artifacts, not application startup side effects.
Migration records live under `db/migrations/` and must describe preflight,
apply SQL, read-only verification SQL, rollback, and post-deploy checks.

### 6.3 Fixture, Seed, And Production Separation

Design rule:

- Demo fixture data lives under `app/public/data/` and is enabled only by
  explicit fixture mode.
- Test seed data is used by Docker and contract tests.
- Production data is loaded and governed outside service startup.

No code path should allow fixture or seed data to masquerade as production
data.

### 6.4 Data Access Pattern

The API uses typed resource definitions and parameterized queries. Public row
serialization must be centralized in the resource contract so endpoint handlers
do not duplicate table-specific column ordering or response shaping.

Future write, import, or analytical data paths should be introduced behind
separate contracts rather than overloading the current read-resource boundary.

## 7. API Design

### 7.1 API Style

The modern API is a compatibility-oriented HTTP service implemented in
TypeScript and compiled to CommonJS output under `dtoapi/modern/lib/`.

The initial design avoids a web framework. A framework may be adopted later if
the endpoint set grows enough to require stronger routing, middleware,
validation, authentication, or OpenAPI integration. Until then, the standard
Node HTTP runtime keeps the operational surface small.

### 7.2 Public Endpoint Classes

| Endpoint class | Contract |
| --- | --- |
| Root | Preserve captured root response behavior, CORS headers, and gzip behavior. |
| Read resources | Serve seeded DB-backed compatibility responses through typed resource contracts. |
| Planning-context resources | Serve read-only descriptive fixture summaries/details from `data/planning-context/*.json` with explicit guardrail flags. |
| Health | `/healthz` reports shallow process liveness. |
| Readiness | `/readyz` verifies database reachability and `baseline-read-v1`. |
| Unsupported methods | Known record routes return explicit `405 Method Not Allowed`. |
| Errors | Raw database errors are logged server-side and not exposed in client response bodies. |

### 7.3 Response Design

API responses must use shared typed response helpers for:

- JSON serialization.
- Success envelope shape.
- Error envelope shape.
- Root endpoint payload.
- Resource record wrapping.
- Status code and header behavior.

Endpoint handlers should not hand-build ad hoc public envelopes when an
existing contract helper applies.

### 7.4 Database Configuration

The API reads database configuration from environment variables. Production
startup must fail fast when neither `DATABASE_URL` nor the required discrete
database fields are configured.

Supported configuration forms:

- `DATABASE_URL`.
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`,
  `DATABASE_DB`.

Test configuration may use the corresponding `TEST_DATABASE_*` variables.

### 7.5 API Evolution Rules

- Add new API behavior under `dtoapi/modern/src/`.
- Add or update contract tests under `dtoapi/modern/test/` or root-level tests.
- Preserve public response shapes unless a breaking change is accepted in the
  requirements, design, test, and release documents.
- Keep raw SQL construction inside typed data-access boundaries.
- Keep readiness checks aligned with required production schema.
- Do not reintroduce the retired Nodal runtime.

## 8. Frontend Design

### 8.1 UI Model

The frontend is a map-first static application. Its first-page design centers
on spatial business planning rather than a marketing landing page. The map,
layer controls, sidebar behavior, and data-backed markers are the core
experience.

The first page now includes a planning-context panel that reads same-origin
summary data from `GET /v1/planning-context`, requests same-origin detail from
`GET /v1/planning-context/:id` for the selected option, and renders
descriptive municipality/category options plus visible confidence,
limitations, unresolved questions, and CBP fact values with explicit masking
and approximation rules for disclosure-limited and rounded source rows.

The browser should request same-origin data paths such as `/v1/unis`. It should
not need to know the private API service origin in integrated deployments.

### 8.2 Source Ownership

First-party browser behavior is authored in TypeScript under `app/public/src/`
and compiled to committed browser assets under `app/public/js/`.

Current boundaries:

- `map_config.ts`: map defaults, tile provider defaults, endpoint selection,
  and university record normalization.
- `map.ts`: map creation, university loading, marker rendering, and DOM
  startup.
- `main.ts`: layer visibility, sidebar, and layer-menu toggle behavior.
- `planning_context.ts`: planning-context summary loading, selected-detail
  loading, descriptive CBP fact-value formatting, and panel rendering with
  explicit guardrail filtering.

Compiled JavaScript remains committed because `app/public/index.html` serves
static browser files directly.

### 8.3 Static Asset Policy

Vendored and generated assets are isolated under:

- `app/public/vendor/`
- `app/public/Untitled/`
- `app/public/original_art/`

First-party behavior should not be mixed into vendored files. If vendored
assets are replaced or upgraded, the change must identify the source,
version/license implications, and browser smoke impact.

### 8.4 Frontend Evolution Rules

- Prefer explicit `data-ui` and `data-map` hooks for browser behavior and
  smoke coverage.
- Keep browser requests same-origin for API paths.
- Keep fixture fallback explicit and test/demo-only.
- Preserve map load, layer menu toggle, sidebar toggle, marker rendering, and
  planning-context summary/detail rendering from same-origin API paths with
  clean console behavior in browser smoke tests.
- Keep descriptive fact rendering deterministic: disclosure-limited `D` values
  render as masked and rounded/noise-flagged `H` values render as approximate.
- Introduce a frontend framework only when product complexity justifies it and
  after current static behavior is covered.

## 9. Deployment Design

### 9.1 Service Topology

The deployment design uses two Node services plus PostgreSQL:

- `app`: public-facing static asset server and same-origin API proxy.
- `api`: private modern API service.
- `database`: PostgreSQL reachable by the API.

The browser should reach only the app origin. The API should remain private to
the service network in normal production topology.

### 9.2 Health And Readiness

| Service | Endpoint | Meaning |
| --- | --- | --- |
| app | `/healthz` | Static app process is alive and reports proxy/fixture state. |
| api | `/healthz` | API process is alive. |
| api | `/readyz` | API can reach the database and the required read schema is present. |

Load balancers and deployment platforms should use app `/healthz` for public
traffic health and API `/readyz` for API readiness.

### 9.3 Release Design

Release candidates should be built from a single intended commit and promoted
as a compatible app/API artifact pair.

Required release design controls:

- Production secrets come from the platform secret store.
- `UTOPLAN_DEMO_FIXTURE` remains unset in production.
- Database changes are applied separately from service startup.
- `/readyz` must pass before app traffic depends on a new API release.
- Public `/v1/unis` and `/v1/planning-context` must be smoke-tested through
  the app origin.
- Rollback restores the last known-good app/API artifact pair and follows any
  database rollback note from the release artifact.

### 9.4 Docker Design

Docker validation is part of the design because the production topology depends
on container networking and PostgreSQL integration.

Key validation paths:

- `docker build -t utoplanme:modernization .`
- `npm run docker:test:db`
- `npm run docker:test:proxy`
- `npm run test:browser:start-local`
- `npm run docker:test:start-local-browser`

Docker checks may be skipped only when Docker is unavailable; skipped checks
and reasons must be recorded in the change report.

The host-native `npm run test:browser:start-local` path keeps the app, API,
and browser on the host machine, but it must still run against a deterministic
seeded database. The test honors explicit `TEST_DATABASE_*` settings;
otherwise it provisions the Compose `db` service, discovers its
loopback-mapped port, ignores ambient database environment variables such as
`DATABASE_URL`, and tears the service down after the run. Operators may opt
into an existing baseline-ready database only through an explicit test-specific
override.

## 10. Interface Design

### 10.1 Browser-To-App Interface

| Interface | Contract |
| --- | --- |
| Static assets | Files under `app/public/` are served by `app/app.js`. |
| API paths | Browser uses same-origin `/v1/*`; app handles proxy or explicit fixture mode. |
| App health | `GET /healthz` reports service identity and data mode. |

### 10.2 App-To-API Interface

| Interface | Contract |
| --- | --- |
| Proxy origin | `UTOPLAN_API_ORIGIN` points the app to the private API origin. |
| Path forwarding | Same-origin `/v1/*` requests are forwarded to the API in integrated mode. |
| Failure behavior | Proxy failures must be observable through tests, logs, and smoke checks. |

### 10.3 API-To-Database Interface

| Interface | Contract |
| --- | --- |
| Connection config | `DATABASE_URL` or discrete `DATABASE_*` values. |
| Query boundary | Centralized typed database helper and parameterized resource queries. |
| Schema readiness | `/readyz` verifies `baseline-read-v1`. |
| Migration boundary | Database mutation is outside service startup and documented in `db/migrations/`. |

### 10.4 Operator Interface

Operators interact with documented scripts and runbooks:

- `npm run install:all`
- `npm run build`
- `npm run test`
- `npm run verify:deployment`
- `npm run verify:release`
- `npm run verify:release-smoke`
- `docs/production-deployment.md`
- `docs/database-migrations.md`

Script contracts should remain non-interactive unless an operator-facing manual
step is explicitly documented.

## 11. Design Decisions

| Decision | Rationale | Consequence |
| --- | --- | --- |
| Keep static app dependency-free where practical. | Reduces runtime attack surface and keeps serving behavior transparent. | Richer client features require deliberate framework review. |
| Keep API private behind app proxy. | Preserves same-origin browser behavior and narrows public exposure. | App service owns proxy configuration and health evidence. |
| Use modern TypeScript API instead of retired Nodal runtime. | Removes obsolete dependency risk while preserving captured contracts. | New behavior must be implemented in `dtoapi/modern`. |
| Defer API framework selection. | Current endpoint set is small enough for typed Node HTTP. | Framework adoption needs a documented design trigger. |
| Commit compiled browser JS. | Static HTML references browser-facing assets directly. | TypeScript changes must keep generated assets in sync. |
| Treat migrations as release artifacts. | Prevents accidental production mutation at startup. | Operators must apply and verify schema changes intentionally. |
| Enforce Puerto Rico-only data intake. | Aligns with product scope and reduces provenance risk. | Broader datasets require explicit filter and approval. |
| Keep fixture mode explicit. | Prevents demo data from being confused with production data. | Offline demos need `UTOPLAN_DEMO_FIXTURE=1`. |

## 12. Constraints

### 12.1 Technical Constraints

- Node-based workspace commands and lockfiles are authoritative.
- The active API runtime is TypeScript compiled to CommonJS.
- The browser app is static and should remain compatible with same-origin
  `/v1/*` requests.
- PostgreSQL is the current production data store.
- `baseline-read-v1` readiness is required for current DB-backed API behavior.

### 12.2 Operational Constraints

- Production database credentials must not be committed.
- Production startup must validate configuration but not mutate schema.
- Docker topology checks are expected for release readiness when Docker is
  available.
- App/API artifact pairs should be promoted together from the same commit.

### 12.3 Product And Data Constraints

- Puerto Rico remains the active data scope.
- Source provenance is part of product trust.
- Unresolved legacy table sources remain blocked for production-style import
  until source, license, scope, and transform assumptions are recorded.

## 13. Evolution Rules

Use these rules when modifying the design:

1. Preserve public contracts unless the change is intentional, documented, and
   tested.
2. Add tests at the boundary where behavior changes: API contract, browser
   smoke, data registry, migration artifact, deployment config, or release
   smoke.
3. Update the standards corpus when architecture, interfaces, data policy,
   quality gates, requirements, release process, or risk posture changes.
4. Keep compatibility layers small and named by ownership.
5. Prefer additive database changes before application code requires them.
6. Keep destructive database changes in a separate release after old code paths
   are retired.
7. Introduce new dependencies only when they remove real complexity or enable a
   required capability.
8. Treat performance rewrites, including WebAssembly or larger frontend/API
   frameworks, as reactive decisions backed by measurement.
9. Keep production, seed, and fixture data paths visibly separate.
10. Keep deployment and rollback instructions current with the actual runtime
    design.

## 14. Verification Mapping

| Design area | Primary verification |
| --- | --- |
| Root workspace integrity | `npm run install:all`, `npm run build`, `npm run test` |
| API contracts | `npm run test:api`, `npm run test:api:modern` |
| DB read contract | `npm run docker:test:db` |
| App/API proxy | `npm run docker:test:proxy` |
| Browser map behavior | `npm run test:browser`, `npm run test:browser:start-local`, `npm run docker:test:start-local-browser` |
| Deployment config | `npm run verify:deployment`, `npm run verify:release` |
| Release smoke | `npm run verify:release-smoke`; set `UTOPLAN_RELEASE_SMOKE_JSON=1` when sanitized structured evidence is required. |
| Data source scope | `npm run test:data-sources` |
| Migration artifacts | `npm run test:migration-artifacts` |

## 15. Audit Hooks

Use these hooks during design review, PR review, release review, and periodic
standards-corpus audits:

- Architecture: Has the app/API/database topology changed, and is
  `docs/deployment-topology.md` still accurate?
- API: Did any public response shape, route behavior, header, gzip behavior,
  error envelope, method handling, or readiness condition change?
- Frontend: Does the browser still use same-origin `/v1/*` data paths, and do
  map load, toggles, markers, and console cleanliness remain covered?
- Data: Are new data sources Puerto Rico-scoped, licensed, registered, and
  separated from fixtures and test seeds?
- Database: Does any schema change have a migration artifact with preflight,
  apply, verification, rollback, and post-deploy checks?
- Deployment: Are production secrets external, fixture mode disabled, app
  `/healthz` useful, and API `/readyz` aligned with the required schema?
- Security: Did new dependencies, proxy behavior, data import paths, or
  deployment variables change the threat surface?
- Performance: Was any new heavy computation, large data load, or map-rendering
  path measured before optimization or rewrite work?
- Documentation: Were IEEE 730, 828, 829, 830, 1012, 1016, and 1058 documents
  updated when their governed design surface changed?
- Release: Are the app and API artifacts from the same intended commit, and is
  the rollback path documented before promotion?
