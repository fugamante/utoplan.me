# IEEE 1016 Software Design Description Audit Corpus

Status: active audit guide  
Scope: utoplan.Me Modernization fork  
Standard focus: IEEE 1016 Software Design Description  
Owning corpus file: `docs/standards/audits/ieee-1016-design-audit.md`

## Purpose

This corpus is the standing audit and control guide for the project's Software
Design Description. It defines the evidence, design consistency checks,
architecture drift checks, hardening and optimization recommendation rules, and
update triggers that keep IEEE 1016 design documentation accurate while the
modernization fork evolves.

The current design baseline is a map-first static frontend served by `app`, a
modern TypeScript Node API under `dtoapi/modern`, and PostgreSQL as the
authoritative read store. The browser uses same-origin `/v1/*` paths through
the app proxy; the API remains private to the service network and exposes
database-backed readiness through `/readyz`.

## IEEE 1016 Audit Objective

Use this guide to audit whether design descriptions remain complete enough for
a maintainer to understand, modify, verify, deploy, and harden the system
without relying on implicit tribal knowledge.

The audit should confirm that:

- design views describe the implemented app/API/database boundaries
- public contracts are traceable to tests and deployment checks
- data provenance and fixture boundaries are reflected in the design
- operational controls such as health, readiness, rollback, and fail-fast
  configuration are represented as design responsibilities
- recommendations are classified as required hardening, required verification,
  required documentation, optimization, or deferred with rationale

## Design Evidence Map

Review these artifacts during each IEEE 1016 audit:

| Evidence | Design role | Audit question |
| --- | --- | --- |
| `README.md` | product context, project layout, root commands | Does the design still support the map-first Puerto Rico business-planning goal and documented local flow? |
| `docs/modernization-roadmap.md` | current design state and phased intent | Are completed and in-progress design claims still true in code and tests? |
| `docs/api-modernization.md` | API component design and compatibility boundary | Are typed API modules, generated output, and compatibility rules still aligned? |
| `docs/frontend-inventory.md` | frontend component design and asset ownership | Are served assets, TypeScript boundaries, data hooks, and fixture rules current? |
| `docs/product-scope.md` | product-boundary design | Does the design keep planning-context behavior descriptive and inside the approved non-recommendation scope? |
| `docs/business-location-decision-framework.md` | planned domain-contract design | Does future context start from operating needs and assign evidence reach before place comparison? |
| `docs/deployment-topology.md` | runtime topology and request flow | Does deployment design still match app/API/database service responsibilities? |
| `docs/production-deployment.md` | operator design and release controls | Are health, readiness, secret, migration, rollback, and smoke-check responsibilities covered? |
| `docs/database-migrations.md` | database evolution design | Are schema contracts, migration artifacts, rollback notes, and readiness baselines current? |
| `docs/data-intake.md` | source intake design | Does design preserve Puerto Rico-only source controls before import work? |
| `docs/data-provenance.md` | source trust design | Are unresolved provenance gaps visible in design decisions? |
| `db/migrations/` | database design baseline | Do migration artifacts match API readiness and read-query assumptions? |
| `data/sources/puerto-rico.json` | approved source registry | Are data design assumptions backed by registered source metadata? |
| `data/mappings/puerto-rico-business-categories.json` | planning-context data design | Are category-to-NAICS mappings explicit and descriptive rather than implicit scoring logic? |
| `data/municipalities/planning-context-municipalities.json` | planning-context label design | Are active municipality labels source-backed instead of placeholder UI text? |
| `data/planning-context/` | planning-context fixture design | Do summary/detail fixtures expose confidence, limitations, and unresolved questions? |
| `app/app.js` | app server/proxy design | Does app serving, `/healthz`, proxying, and fixture gating match documented topology? |
| `app/public/src/` | typed browser design | Are map, UI, and configuration responsibilities separated and tested? |
| `dtoapi/modern/src/` | typed API design | Are routing, response envelopes, records, resources, and database access separated and tested? |
| `app/test/`, `dtoapi/modern/test/`, `dtoapi/test/`, and `test/` | design verification | Do tests prove design contracts rather than only implementation details? |
| Dockerfiles, Compose files, and CI definitions | deployment design verification | Do container and CI paths exercise the intended topology and release gates? |

## Design View Checklist

### Context View

- Does the design identify primary users and operators: founders, investors,
  planners, local development teams, and maintainers?
- Does the design keep the product purpose clear: source-backed place analysis
  for Puerto Rico business formation?
- Are demo, test, seed, recovered legacy, and production data described as
  separate design concepts?
- Are provenance gaps treated as product and design constraints, not merely
  documentation chores?
- Is the descriptive planning-context boundary explicit enough to block score,
  ranking, or recommendation drift?
- Are mutating or production-impacting operations explicit and reviewable?

### Decomposition View

- Is `app/` still a dependency-free static app server plus same-origin proxy?
- Are first-party browser responsibilities isolated under `app/public/src/`
  and compiled to committed browser assets under `app/public/js/`?
- Are vendored and generated browser assets isolated from first-party code?
- Is `dtoapi/modern/src/` still the active API runtime source boundary?
- Are API response, root, resource, records, database, and server concerns kept
  in focused modules?
- Is generated API output under `dtoapi/modern/lib/` still ignored and
  reproducible from TypeScript sources?
- Are database schema artifacts under `db/migrations/` treated as release
  design artifacts rather than startup side effects?

### Interface View

- Are browser data requests still same-origin `/v1/*` calls from the app
  origin?
- Does `app/app.js` proxy `/v1/*` only when `UTOPLAN_API_ORIGIN` is configured?
- Is fixture mode still explicit through `UTOPLAN_DEMO_FIXTURE=1`?
- Are `/healthz` and `/readyz` responsibilities clear and unchanged?
- Are API response envelopes, error envelopes, status codes, CORS behavior,
  gzip handling, unsupported methods, and missing records covered by tests?
- Are database connection settings and production fail-fast rules documented
  and verified?
- Are public data shapes and column orders owned by typed resource contracts?

### Data View

- Does every production-style data design depend on registered Puerto Rico
  source evidence before import work begins?
- Are broad national sources blocked unless a deterministic Puerto Rico filter
  is documented and enforced?
- Are legacy provenance gaps such as `cdepts`, `businesses`, and `grade_cs`
  still blocked from production-style use until source, license, and transform
  evidence exists?
- Do business-category mappings and planning-context fixtures remain explicit,
  descriptive, and visibly confidence-bounded?
- Do seed data and demo fixtures remain visibly separate from production data?
- Does `/readyz` verify the database schema baseline required by the running
  API?
- Are migration artifacts paired with read-only verification SQL, rollback
  notes, and readiness impact analysis?

### Dynamic And Runtime View

- Does the documented request flow remain:
  `Browser -> app -> /v1/* proxy -> api -> PostgreSQL`?
- Does local integrated validation still use `npm run start:local` with app and
  API ports wired through environment variables?
- Does production design keep the API private behind the app proxy?
- Do app and API startup paths avoid implicit schema mutation?
- Do failure paths avoid serving fixture data in production-like runtime paths?
- Are raw database errors logged server-side rather than exposed to clients?
- Are rollback triggers tied to observable health, readiness, endpoint, query,
  and browser smoke failures?

### Deployment And Operations View

- Are deployment artifacts built from the intended commit and lockfiles?
- Are app/API/database release responsibilities documented together?
- Are required production secrets and environment variables explicit?
- Does release validation include deployment verification, release smoke checks,
  Docker database/proxy/browser checks when available, and dependency audits?
- Are rollback and recovery steps consistent with the design topology?
- Are Docker and CI checks exercising the same design boundaries described in
  the SDD evidence?

## Design Consistency Checks

Run these checks whenever design documentation or architecture-relevant code
changes:

- Compare README project layout against actual top-level directories and
  standards docs.
- Compare root command inventory against `package.json` scripts.
- Compare `docs/api-modernization.md` module claims against
  `dtoapi/modern/src/` and `dtoapi/modern/test/`.
- Compare `docs/frontend-inventory.md` served-surface claims against
  `app/app.js`, `app/public/index.html`, `app/public/src/`, and
  `app/public/js/`.
- Compare `docs/deployment-topology.md` request flow against Compose files,
  app proxy behavior, API port exposure, and health checks.
- Compare `docs/production-deployment.md` preflight, smoke, and rollback steps
  against root scripts and verification scripts.
- Compare database migration docs against actual artifacts under
  `db/migrations/`.
- Compare data-intake and provenance docs against `data/sources/puerto-rico.json`
  and any import, seed, or fixture changes.
- Compare `docs/product-scope.md`, category mappings, and planning-context
  fixtures against frontend and API behavior so descriptive-only guardrails do
  not drift silently.
- Compare the decision framework and roadmap immediate next step against the
  SDD planned profile/reach boundary; do not accept implementation claims until
  a versioned schema and executable three-scenario matrix exist.
- Confirm active mapped tables (`cbps`, `unis`) have consistent full
  preserved-column `legacySchemaMap` coverage in the registry and
  `docs/data-source-schema-mapping.md`.
- Confirm blocked import candidates expose machine-readable `importReadiness`
  records so unresolved source risks are not left as prose-only warnings.
- Confirm unmatched `unis` alias/campus promotions depend on a checked-in
  policy document and row-level review artifact before geocoder cache work
  claims import evidence.
- Confirm a stronger-authority-blocked `unis` path keeps the registered NCES
  identity, U.S. Department of Education accreditation, and Puerto Rico
  ORLIE/JIP licensure corroboration entries as review-only sources rather than
  direct import inputs.
- Confirm design claims that mention tests are backed by executable tests or a
  documented manual verification procedure.

## Architecture Drift Checks

Open an architecture drift finding when any of these conditions appears:

- Browser code calls the API through a hard-coded cross-origin URL instead of
  the app-origin `/v1/*` path.
- The app silently serves fixture data outside explicit demo or test mode.
- The API becomes publicly exposed in deployment documentation without an
  accepted topology change.
- API behavior is implemented outside `dtoapi/modern/src/` without a documented
  compatibility reason.
- Handwritten JavaScript replaces an established TypeScript boundary for active
  app or API behavior without a migration note.
- Generated output, dependency trees, logs, or temporary build artifacts become
  tracked source.
- Database schema mutation moves into application startup or request handling.
- A new table, column, route, response shape, or data source changes runtime
  behavior without an SDD evidence update.
- Readiness checks no longer prove the schema expected by the running API.
- Seed, fixture, recovered legacy, and production data are conflated.
- Deployment or CI checks validate a topology different from the documented
  production design.
- Security or failure-handling behavior contradicts documented fail-closed,
  private-API, secret, or raw-error handling rules.

## Hardening And Optimization Recommendation Rules

Classify findings with these thresholds:

- Required hardening: design drift can expose incorrect production data, serve
  fixtures in production-like paths, leak secrets or raw database errors,
  bypass readiness, break rollback, weaken API compatibility, or hide
  provenance gaps.
- Required verification: design behavior changed without a contract test,
  browser smoke test, database readiness check, migration verification, or
  release smoke procedure.
- Required documentation: implemented design changed but README, roadmap,
  topology, deployment, migration, provenance, or standards evidence did not.
- Optimization: proposed design change improves performance, maintainability,
  observability, startup time, test speed, or operator ergonomics without
  weakening existing contracts.
- Defer with rationale: recommendation is valid but outside the current risk
  surface; record the trigger, owner area, and expected evidence before action.

Recommendations must include:

- affected design view or component
- evidence path or command
- risk being reduced
- proposed change
- verification command or inspection step
- rollback or removal condition when temporary

Do not recommend framework replacement, WebAssembly, data import, production
deployment, or destructive database change acceptance unless the design
evidence, validation evidence, provenance evidence, and rollback evidence are
all present.

## Update Triggers

Update this corpus, the IEEE 1016 SDD, or both when any of these occur:

- new service, package, runtime, deployment target, CI workflow, or Docker
  topology
- new or changed `/v1/*`, `/healthz`, `/readyz`, response envelope, error
  behavior, CORS behavior, gzip behavior, or unsupported-method behavior
- frontend changes to map rendering, data loading, layer controls, sidebar
  controls, runtime configuration, static asset serving, or fixture behavior
- new TypeScript boundary, generated output location, vendored asset location,
  or JavaScript ownership decision
- new database table, column, migration artifact, schema baseline, seed data,
  readiness contract, or rollback requirement
- new data source, source registry schema change, provenance decision, import
  script, fixture replacement, or production data classification
- deployment secret policy, health check, release smoke check, rollback flow,
  or fail-fast configuration change
- accepted hardening or optimization recommendation that changes architecture,
  component responsibility, interface behavior, data flow, or operator flow
- failed release, failed Docker validation, security finding, production
  incident, or audit finding that exposes design drift
- new IEEE 730, 828, 829, 830, 1012, or 1058 artifact that changes design
  traceability expectations

## Audit Cadence

- Per implementation bundle: inspect architecture-relevant diffs and update
  design evidence before merge.
- Per release candidate: confirm design views, deployment topology, readiness,
  migrations, data provenance, and release smoke evidence are consistent.
- Monthly while active: review architecture drift findings, open hardening
  recommendations, deferred design choices, stale roadmap claims, and
  provenance blockers.
- After incident or failed deployment: record design impact, classify the
  finding, update the affected design evidence, and add a verification gate.

## Finding Record Template

Use this structure when recording an IEEE 1016 audit finding in a standards
document, issue, or pull request:

```text
Finding:
Severity:
Design view:
Component or interface:
Evidence:
Risk:
Recommendation:
Verification:
Status:
Owner:
Review date:
```

## Current Control Expectations

- The browser remains app-origin first and relies on same-origin `/v1/*` data
  flow.
- The app remains the public static server and proxy boundary.
- The API remains a private TypeScript Node service with typed contracts and
  database-backed readiness.
- PostgreSQL schema changes remain explicit migration artifacts, not startup
  side effects.
- Fixture mode remains explicit and excluded from integrated production-like
  deployment paths.
- Puerto Rico-only, source-backed data remains the design scope until a broader
  source scope is explicitly approved, documented, and verified.
