# IEEE 830 Software Requirements Specification

## 1. Purpose

This Software Requirements Specification defines the practical requirements for
the `utoplan.Me` modernization fork. It captures the current product contract,
modernization constraints, data-governance requirements, acceptance criteria,
and traceability expectations needed to keep the fork useful, testable, and
auditable.

The requirements in this document are authoritative for active modernization
work unless a narrower implementation document explicitly supersedes a specific
requirement and updates this SRS in the same change set.

## 2. Product Scope

`utoplan.Me` is a map-first roadmap and decision-support tool for evaluating
business formation opportunities in Puerto Rico. The product helps founders,
investors, planners, and local development teams reason about where a business
idea can take root by correlating local data such as municipalities, higher
education, workforce and industry signals, business density, zoning candidates,
infrastructure candidates, and other source-backed resources.

The modernization fork focuses on rebuilding the original hackathon prototype
into a reproducible, testable, deployable foundation. The current product does
not claim production-grade economic recommendations. It preserves and modernizes
the known public app/API behavior while the project rebuilds source-backed
Puerto Rico data coverage and documents unresolved provenance gaps.

## 3. References

- `README.md`
- `docs/modernization-roadmap.md`
- `docs/api-modernization.md`
- `docs/frontend-inventory.md`
- `docs/product-scope.md`
- `docs/business-location-decision-framework.md`
- `docs/deployment-topology.md`
- `docs/production-deployment.md`
- `docs/data-intake.md`
- `docs/data-provenance.md`
- `docs/data-source-schema-mapping.md`
- `docs/database-migrations.md`
- `data/mappings/puerto-rico-business-categories.json`
- `data/municipalities/planning-context-municipalities.json`
- `data/planning-context/`
- `db/migrations/202605211200_baseline_read_v1.md`
- `docs/standards/ieee-730-sqa-plan.md`
- `docs/standards/ieee-829-test-document.md`
- IEEE 830, Software Requirements Specification standard structure.

## 4. Product Context

### 4.1 Origin And Direction

The original `utoplan.Me` prototype was created during the 2016 Puerto Rico
Cuenta Hackathon. The modernization fork preserves that origin while replacing
obsolete runtime components, clarifying source provenance, and hardening the
deployment and validation paths.

The long-term direction is a place-based planning engine that can simulate and
stimulate business formation by surfacing evidence, constraints, and tradeoffs.
Near-term work is intentionally narrower: keep the map and active legacy read
contracts working while rebuilding the data and technical foundation. The next
planned product contract starts from a business operating profile and evaluates
each need at its decision-relevant geographic reach instead of treating a
municipality or available dataset as the default unit of analysis.

### 4.2 Current System Shape

- `app/` serves dependency-free Node static assets and proxies same-origin
  `/v1/*` API requests when `UTOPLAN_API_ORIGIN` is configured.
- `dtoapi/modern/` serves the modern TypeScript API.
- PostgreSQL stores the active read schema expected by the modern API.
- `db/migrations/` records migration artifacts and the `baseline-read-v1`
  schema reference.
- `data/sources/puerto-rico.json` records approved candidate source metadata.
- `data/mappings/puerto-rico-business-categories.json` records the current
  candidate business-category to NAICS crosswalk used by descriptive
  planning-context fixtures.
- `data/municipalities/planning-context-municipalities.json` records the
  source-backed municipality display names used by the active planning-context
  fixture set.
- `data/planning-context/` records descriptive municipality/category fixture
  slices served by the read-only planning-context API.
- Docker and npm scripts provide build, test, local integration, and release
  smoke checks.

### 4.3 Operating Assumptions

- Puerto Rico is the only active data scope unless a broader scope is explicitly
  approved and reflected in the data registry and this SRS.
- Fixture and seed data are useful for tests and demos but are not production
  data.
- The browser should normally know only the app origin; the API should remain
  private behind the app proxy in integrated deployments.
- Production startup validates configuration and readiness; it must not mutate
  database schema.
- Public behavior should remain stable unless a breaking change is explicitly
  approved and traced through requirements, design, tests, release notes, and
  migration artifacts when applicable.

## 5. Users And Stakeholders

| User or stakeholder | Primary need |
| --- | --- |
| Founder or entrepreneur | Explore where a business idea may fit local conditions in Puerto Rico. |
| Investor or lender | Review place-based signals before committing capital or diligence time. |
| Planner or economic development team | Compare municipalities, industries, education resources, and local constraints. |
| Data steward | Approve, trace, and validate Puerto Rico-only source-backed records. |
| Modernization maintainer | Preserve behavior, reduce runtime risk, and keep validation reproducible. |
| Release operator | Deploy app/API artifacts with clear health, readiness, rollback, and smoke criteria. |
| Auditor or reviewer | Trace requirements to tests, documents, data provenance, and accepted risks. |

## 6. Constraints

- The static app must preserve same-origin `/v1/*` browser requests for active
  API data in integrated deployments.
- Production deployments must keep `UTOPLAN_DEMO_FIXTURE` unset.
- The modern API must run on the pinned Node 26 major declared in
  `.node-version` and `.nvmrc`, and compile TypeScript sources before runtime
  or tests use generated CommonJS output.
- The modern API must retain typed response, resource, schema, root, routing,
  and database boundaries.
- PostgreSQL read compatibility must remain aligned with `baseline-read-v1`
  until a newer baseline is approved.
- New production-style data imports must use registry-approved Puerto Rico
  sources with recorded publisher, license, URLs, scope, retrieval date, target
  endpoint, and source-basis evidence.
- The legacy Nodal runtime is retired from the normal project tree and must not
  be reintroduced as an active dependency without explicit approval.
- Docker validation should be used for compatibility checks when Docker is
  available because the production topology depends on container networking and
  seeded PostgreSQL behavior.

## 7. External Interface Requirements

### 7.1 Browser Interface

- The first page shall remain map-first and load public static assets from the
  app service.
- The browser shall request active university map data from same-origin
  `/v1/unis` by default.
- The browser may use `app/public/data/unis.json` only through explicit
  offline fixture mode or test configuration.
- The browser map shall render returned university records with stable
  latitude, longitude, title, address, and description handling.

### 7.2 Static App Interface

- The app service shall serve static assets under `app/public/`.
- The app service shall expose `GET /healthz` with service identity, proxy
  state, and fixture state sufficient for deployment checks.
- When `UTOPLAN_API_ORIGIN` is set, the app service shall proxy same-origin
  `/v1/*` requests to the configured API origin.
- The app service shall reject invalid API origins and shall not allow
  `UTOPLAN_API_ORIGIN` and `UTOPLAN_DEMO_FIXTURE=1` to be enabled together.

### 7.3 API Interface

- The API shall expose `GET /healthz` for shallow process health.
- The API shall expose `GET /readyz` for database reachability and schema
  readiness.
- The API shall support active read collections and records for the preserved
  legacy resource names `unis`, `muns`, `cdepts`, `cbps`, `busines`, and
  `grace_cs`.
- Known record routes shall reject unsupported methods with `405 Method Not
  Allowed`.
- API responses shall preserve the typed compatibility envelope and avoid
  exposing raw database errors to clients.
- API route, CORS, gzip, root response, resource, records, schema, and readiness
  behavior shall remain contract-tested.

### 7.4 Database Interface

- The API shall connect to PostgreSQL through `DATABASE_URL` or the documented
  discrete database environment variables.
- Production API startup shall fail fast when required database configuration is
  missing.
- `/readyz` shall verify the required read schema before the API is considered
  ready.
- Database schema changes shall be represented as reviewed migration artifacts
  under `db/migrations/`.

### 7.5 Data Source Interface

- Candidate source records shall be registered before import work begins.
- Registry entries shall declare whether the source is Puerto Rico-only or
  requires a deterministic Puerto Rico filter such as Census `state:72`.
- Registry entries that target active preserved tables with available evidence
  (currently `cbps` and `unis`) shall include legacy-column mapping coverage and
  unresolved-field notes.
- Import work shall not use broad national datasets unless the registry and
  importer both enforce the approved Puerto Rico filter.

## 8. Functional Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-001 | The system shall serve the public map application from a clean checkout. | `npm run install:all`, `npm run build`, and app smoke checks pass. |
| FR-002 | The first page shall request active map data from same-origin `/v1/unis`. | Browser and static config tests show `/v1/unis` is the default data URL. |
| FR-003 | The app shall proxy `/v1/*` requests to the modern API when configured. | `npm run docker:test:proxy` proves `/v1/unis` is served through the proxy from API seed data. |
| FR-004 | Offline fixture behavior shall require explicit fixture mode. | Default static app runs do not serve `/v1/unis` from `app/public/data/unis.json`; `UTOPLAN_DEMO_FIXTURE=1` is required. |
| FR-005 | The modern API shall preserve the active legacy read resource contracts. | DB-backed API contract tests pass for collections, records, missing records, and supported resource names. |
| FR-006 | The API shall expose shallow health and database-backed readiness endpoints. | `GET /healthz` returns process health; `GET /readyz` returns ready only when DB and schema checks pass. |
| FR-007 | Known unsupported API methods shall fail explicitly. | Known record routes return `405` for unsupported methods. |
| FR-008 | Production startup shall fail on missing or invalid API database configuration, and production app/API service commands shall not require root privileges. | Deployment verification and production API startup reject missing DB config, malformed URLs, and non-PostgreSQL URL schemes; the production app and API images run their service commands as the unprivileged `node` user. |
| FR-009 | The release flow shall smoke test the public app origin and data path. | `npm run verify:release-smoke` checks app `/healthz`, public `/v1/unis`, public `/v1/planning-context`, and optional API `/readyz`. |
| FR-010 | Database schema changes shall be handled as explicit migration artifacts. | New schema work includes artifact sections for preflight, apply, verify, rollback, and readiness impact. |
| FR-011 | New production-style data sources shall be registered before import. | `npm run test:data-sources` passes and registry entries include required source metadata plus legacy mapping evidence for active mapped tables. |
| FR-012 | Unresolved legacy tables shall remain blocked for production import. | `cdepts`, `businesses`, and `grade_cs` imports are blocked until source, license, and transform path are recorded. |
| FR-013 | Public behavior changes shall update related requirements, design, test, and release docs. | Relevant IEEE and project docs change in the same bundle as the behavior change. |
| FR-014 | The API shall expose read-only planning-context summary/detail routes with explicit descriptive-only guardrails. | `GET /v1/planning-context` and `GET /v1/planning-context/:id` return descriptive fixture payloads with guardrail flags and reject unsupported methods with `405`. |
| FR-015 | The first page shall render planning-context summary options from same-origin `/v1/planning-context` and load selected descriptive detail from `/v1/planning-context/:id` without score/ranking/recommendation language. | Browser smoke verifies the summary/detail request paths and rendered descriptive options, source-backed municipality names, confidence, limitations, unresolved questions, and CBP fact-value masking/approximation rules. |
| FR-016 | Before planning-context expansion, the product shall define a versioned business-profile contract and geographic-reach contract covering site-bound, local-catchment, regional-corridor, island-wide, and external-connection evidence. | `data/profile-reach/business-profile-reach-v1.json` holds `mun003_restaurant` constant across small/local, medium/regional, and large/strategic scenarios and `npm run test:profile-reach-contract` verifies profile-dependent relevance, criticality, confidence, limitations, and next validation checks without composite scores or municipality ranks. The contract is implemented as a controlled candidate artifact and is not yet exposed through the API/UI. |
| FR-017 | The product shall maintain a decision-signal registry that links each fixed-selection profile/reach fact to either registered Puerto Rico evidence or an explicit source gap. | `data/profile-reach/decision-signal-registry-v1.json` records signal lens, scenario applicability, geographic reach, recency, interpretation limits, and linked fact ids, while `npm run test:decision-signals` verifies bidirectional linkage between the registry and `data/profile-reach/business-profile-reach-v1.json`. |
| FR-018 | The product shall keep reviewed decision-signal upgrades as descriptive evidence artifacts that cite official Puerto Rico authorities and explicit interpretation limits. | `data/profile-reach/aguada-restaurant-demand-proxy-review.json`, `data/profile-reach/aguada-restaurant-permit-path-review.json`, `data/profile-reach/aguada-restaurant-utility-service-review.json`, `data/profile-reach/aguada-restaurant-site-screening-review.json`, `data/profile-reach/aguada-restaurant-large-site-screening-review.json`, and `data/profile-reach/aguada-restaurant-workforce-pipeline-review.json` record reviewed upgrades for the Aguada restaurant demand, regulatory, infrastructure, site-feasibility, large-site-feasibility, and workforce signals, while the corresponding focused tests verify their authority stacks, fixed-selection linkage, and descriptive-only limits. |

## 9. Nonfunctional Requirements

### 9.1 Reliability

- Health checks shall remain available for app and API process liveness.
- Readiness checks shall prevent app traffic from depending on an API with an
  unreachable or incompatible database.
- Rollback criteria shall include failed readiness, fixture leakage, public
  `/v1/unis` failure, database query failures, and browser smoke failures.

### 9.2 Maintainability

- Active API runtime source shall remain TypeScript-first under
  `dtoapi/modern/src/`.
- Generated CommonJS output under `dtoapi/modern/lib/` shall remain ignored
  build output.
- Static app behavior shall keep first-party TypeScript ownership clear and
  avoid mixing fixture, proxy, and production behavior.
- Documentation shall be updated when requirements, controls, topology, source
  policy, or acceptance gates change.

### 9.3 Security And Privacy

- Production secrets shall come from the deployment platform secret store and
  shall not be committed.
- Raw database errors shall be logged server-side and not exposed in client API
  responses.
- The API shall remain private to the service network in integrated deployment
  unless an explicit public API requirement is approved.
- Dependency audits for root, `app`, `dtoapi`, and `dtoapi/modern` shall remain
  part of release readiness.

### 9.4 Performance

- The first page shall remain suitable for a static map-first experience without
  requiring unnecessary frontend framework runtime dependencies.
- API read endpoints shall use deterministic queries through typed resource
  contracts.
- Performance budgets for first page load and `/v1/unis` response time are not
  yet formalized; defining them is an open requirement for a future hardening
  pass.

### 9.5 Portability And Deployment

- Root npm scripts shall provide the authoritative local build and validation
  path.
- Docker validation shall exercise the app/API/PostgreSQL topology when Docker
  is available.
- The integrated deployment shall expose the app service publicly and keep the
  API service private behind the app proxy.

### 9.6 Usability

- Users shall be able to orient around the Puerto Rico map first.
- The product shall present data as evidence for planning and tradeoff analysis,
  not as an automated replacement for business, permitting, investment, or legal
  judgment.
- Labels, source-backed content, and future recommendations shall avoid implying
  certainty where provenance, coverage, or transformation assumptions are still
  unresolved.
- Product flows shall ask for operating needs before implying place fit and
  shall show the geographic reach governing each fact rather than treating
  municipality boundaries as universally decision-relevant.

## 10. Data And Provenance Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| DR-001 | Active production-style data scope shall remain Puerto Rico-only. | Registry entries are Puerto Rico-only or enforce a documented deterministic Puerto Rico filter. |
| DR-002 | Every accepted source shall record publisher, portal, license, URLs, retrieval date, target endpoint, status, and source-basis note. | `npm run test:data-sources` passes and manual review confirms complete metadata. |
| DR-002A | Active mapped tables (`cbps`, `unis`) shall include full preserved-column source-to-legacy coverage evidence in the registry, with notes for every non-exact mapping. | `npm run test:data-sources` enforces complete `legacySchemaMap` coverage and `docs/data-source-schema-mapping.md` documents the same mapping. |
| DR-002B | Active mapped-table candidates that are not yet safe to import shall record explicit import-readiness blockers in the registry. | `npm run test:data-sources` enforces `importReadiness` status, review date, and blocker records for `cbps`/`unis` candidates. |
| DR-002C | Active mapped-table candidates that derive preserved coordinates through an external geocoder shall pin a reproducible geocoding policy, checked-in cache artifact path, quarantine artifact path, import-boundary artifact path, and reviewed alias/campus decision artifact before import. | `npm run test:data-sources` enforces the `geocodingPolicy` contract for `unis`, while `docs/unis-geocoding-policy.md`, `docs/unis-alias-campus-match-policy.md`, and `data/geocoding/unis-import-boundary-review.json` record the approved workflow and unresolved boundary decision. |
| DR-002D | When `unis` import remains blocked on stronger institution authority, the registry shall retain corroboration sources for institution identity, accreditation, and Puerto Rico licensure review and shall keep them out of the direct row-import path. | `npm run test:data-sources` enforces the NCES, U.S. Department of Education, and Puerto Rico ORLIE/JIP corroboration entries, their Puerto Rico scope controls, and their non-import notes while `docs/data-source-schema-mapping.md` documents their limited evidence role. |
| DR-003 | Demo fixtures, test seed data, replacement candidates, and production data shall remain distinguishable. | Docs and health checks identify fixture mode; release checks verify fixture mode is absent. |
| DR-004 | Original hackathon dataset provenance gaps shall remain visible until resolved. | `docs/data-provenance.md` records known evidence and unresolved source gaps. |
| DR-005 | Source-to-endpoint transforms shall be documented before production import. | Import PRs include field mapping, filters, license evidence, and target endpoint impact. |
| DR-006 | Data used for recommendations or scoring shall expose provenance and confidence limits. | Future recommendation features include source, timestamp, transform, and known limitation metadata. |

## 11. Acceptance Criteria By Release Candidate

A release candidate is acceptable only when the relevant scope passes or records
an explicit accepted risk:

- Clean install and build complete from lockfiles.
- Root tests and relevant API/frontend/data/migration tests pass.
- Docker DB, proxy, and browser checks pass when Docker is available.
- Deployment verification passes for the intended environment contract.
- Release smoke passes against the candidate app origin.
- API `/readyz` reports the expected schema baseline.
- App `/healthz` reports proxy mode and no production fixture mode.
- Public `/v1/unis` and `/v1/planning-context` return through the app origin.
- Required standards, roadmap, API, deployment, migration, and provenance docs
  are updated for changed behavior.
- Skipped checks, accepted risks, and rollback notes are recorded.

## 12. Traceability Matrix

| Requirement | Source or rationale | Verification |
| --- | --- | --- |
| FR-001 | Reproducible modernization goal | `npm run install:all`, `npm run build`, `npm run test` |
| FR-002 | Map-first app and same-origin data contract | `app/test/map_config_contract_test.js`, browser smoke |
| FR-003 | Integrated app/API topology | `npm run docker:test:proxy` |
| FR-004 | Fixture separation policy | static app tests, app `/healthz`, release smoke |
| FR-005 | Preserved legacy read behavior | `dtoapi/modern/test/db_contract_test.js`, resource contract tests |
| FR-006 | Deployment health/readiness contract | server contract tests, `/healthz`, `/readyz`, release smoke |
| FR-007 | API hardening | API route/method contract tests |
| FR-008 | Production fail-fast behavior | `npm run verify:deployment`, `npm run verify:release` |
| FR-009 | Release confidence | `npm run verify:release-smoke` |
| FR-010 | Explicit schema control | migration artifact review, `/readyz` schema checks |
| FR-011 | Source-backed data intake | `npm run test:data-sources` |
| FR-012 | Provenance risk control | `docs/data-provenance.md`, source registry review |
| FR-013 | Documentation consistency | Standards and project-doc review |
| FR-014 | Read-only planning-context API contract | `npm run test:api`, `dtoapi/modern/test/planning_context_test.js` |
| FR-015 | Planning-context summary UI contract | `npm run test:browser`, `npm run test:browser:start-local`, `app/test/static_smoke_test.js` with `test:browser:start-local` running against the provisioned seeded baseline database unless the operator explicitly opts into a known baseline-ready alternative |
| FR-016 | Business profile and geographic reach direction | `docs/product-scope.md`, `docs/business-location-decision-framework.md`, `docs/modernization-roadmap.md`, `data/profile-reach/business-profile-reach-v1.json`, `npm run test:profile-reach-contract` |
| FR-017 | Decision-signal registry direction | `docs/product-scope.md`, `docs/business-location-decision-framework.md`, `docs/data-intake.md`, `data/profile-reach/decision-signal-registry-v1.json`, `npm run test:decision-signals` |
| FR-018 | Reviewed decision-signal evidence upgrades | `docs/product-scope.md`, `docs/data-intake.md`, `data/profile-reach/aguada-restaurant-demand-proxy-review.json`, `data/profile-reach/aguada-restaurant-permit-path-review.json`, `data/profile-reach/aguada-restaurant-utility-service-review.json`, `data/profile-reach/aguada-restaurant-site-screening-review.json`, `data/profile-reach/aguada-restaurant-large-site-screening-review.json`, `data/profile-reach/aguada-restaurant-workforce-pipeline-review.json`, `npm run test:demand-signal-review`, `npm run test:regulatory-signal-review`, `npm run test:infrastructure-signal-review`, `npm run test:site-feasibility-signal-review`, `npm run test:large-site-signal-review`, `npm run test:workforce-signal-review` |
| DR-001 - DR-006, DR-002A | Trustworthy Puerto Rico data product | Registry tests, provenance docs, source-schema mapping docs, import review, future recommendation tests |

## 13. Open Requirements And Risks

- Formal performance budgets for first page load and `/v1/unis` response time
  are still missing.
- The versioned business-profile and geographic-reach contracts in FR-016 are
  implemented as controlled candidate artifacts and remain intentionally out of
  the live API/UI surface.
- The linked decision-signal registry in FR-017 is implemented as controlled
  evidence metadata and must not drift into recommendation logic.
- The original organizer-provided dataset name, license, files, and transform
  path remain unresolved.
- The approved `cbps.cnaic_name` auxiliary join now depends on the checked-in
  `data/naics/cbp-naics-titles.json` Census title artifact staying aligned with
  the registered Puerto Rico CBP source snapshot and its documented rebuild
  command.
- The `unis` replacement candidate now depends on approving reviewed
  alias/campus match rules and quarantine behavior beyond the strict 11-of-57
  exact-match baseline recorded in `data/unis/ipeds-geocode-audit.json`
  before production-style import rows can be generated.
- The `unis` replacement candidate also depends on resolving
  `data/geocoding/unis-import-boundary-review.json` before a partial Census
  cache can be treated as production-style import coverage.
- The `unis` replacement candidate also still needs a stronger institution-
  authority stack than the current Datos.PR directory plus a single auxiliary
  exact-match audit before unresolved real-institution rows are promoted, with
  NCES identity, U.S. Department of Education accreditation, and Puerto Rico
  ORLIE/JIP licensure corroboration kept as review inputs rather than direct
  import sources.
- `cdepts`, `businesses`, and `grade_cs` need source identification before
  production-style import.
- Production migration execution remains operator-managed; no in-repo migration
  runner exists yet.
- Future zoning, workforce, infrastructure, recommendation, scoring, and
  lifecycle-planning features need separate requirements before implementation.

## Audit Hooks

Future project changes must update this document when they:

- Add, remove, rename, or change public app views, map behavior, browser data
  URLs, API endpoints, API resource names, response envelopes, health checks, or
  readiness checks.
- Change app/API deployment topology, API visibility, same-origin proxy policy,
  fixture policy, production startup behavior, or environment configuration.
- Add database tables, columns, migrations, readiness baselines, import scripts,
  mutation paths, or production data workflows.
- Add, retire, or reclassify data sources, source filters, licenses, provenance
  evidence, endpoint mappings, or unresolved data gaps.
- Add recommendation, scoring, simulation, planning, zoning, workforce,
  infrastructure, or post-launch analysis features.
- Change acceptance gates, traceability expectations, release smoke criteria,
  rollback triggers, or required standards-document alignment.
- Accept or retire risks that affect product scope, data trust, security,
  privacy, performance, reliability, usability, or operator safety.
