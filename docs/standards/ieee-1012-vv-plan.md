# IEEE 1012 Software Verification And Validation Plan

## 1. Purpose

This Software Verification and Validation Plan defines how the `utoplan.Me`
modernization fork proves that the product is being built correctly and that
the resulting system is fit for its stated planning purpose.

The plan applies to the static browser app, modern TypeScript Node API,
PostgreSQL read model, Docker deployment topology, release checks, migration
artifacts, data provenance controls, descriptive planning-context artifacts,
and standards corpus. It is intended to remain active for the life of the
modernization fork and to be updated whenever project behavior, gates, risks,
or recommendations change.

## 2. Scope

### 2.1 In Scope

- Verification of source code, scripts, tests, build outputs, Docker topology,
  deployment checks, migrations, and documentation against stated requirements
  and design contracts.
- Validation of product behavior against the modernization goal: a
  reproducible, testable, deployable map-first planning tool for Puerto Rico
  business formation analysis.
- Independent review of public API behavior, browser behavior, data source
  scope, provenance evidence, descriptive planning-context boundaries, release
  readiness, and rollback readiness.
- Ongoing audit of accepted hardening and optimization recommendations.

### 2.2 Out Of Scope

- Certification of unrecovered original hackathon row-level datasets.
- Production migration execution, because the current project records migration
  artifacts but does not include an automated production migration runner.
- Formal accessibility, security, load, usability, or regulatory certification
  until the project accepts specific criteria for those domains.
- Non-Puerto Rico data ingestion unless a broader scope is explicitly approved
  and reflected in the requirements, design, test, data, and release documents.

## 3. V&V Objectives

- Preserve known legacy public behavior while obsolete runtime components are
  replaced.
- Verify that typed API and browser boundaries match executable tests and
  documented contracts.
- Validate that integrated deployments keep the browser on the app origin while
  the app proxies `/v1/*` requests to the private API.
- Confirm that API readiness is tied to the current database read baseline and
  that shallow health checks do not mask schema or data failures.
- Prevent demo fixtures, test seed data, candidate source data, and production
  data from being confused.
- Require source, license, retrieval, Puerto Rico scope, transform, and target
  endpoint evidence before production-style data intake.
- Keep release readiness tied to repeatable commands, Docker compatibility,
  browser smoke coverage, dependency audit status, rollback notes, and open
  anomaly review.

## 4. References

- `README.md`
- `docs/modernization-roadmap.md`
- `docs/api-modernization.md`
- `docs/product-scope.md`
- `docs/database-migrations.md`
- `docs/data-intake.md`
- `docs/data-provenance.md`
- `docs/deployment-topology.md`
- `docs/production-deployment.md`
- `data/mappings/puerto-rico-business-categories.json`
- `data/naics/planning-context-naics-titles.json`
- `data/planning-context/`
- `docs/standards/ieee-730-sqa-plan.md`
- `docs/standards/ieee-829-test-document.md`
- `db/migrations/README.md`
- IEEE 1012, Software Verification and Validation standard structure.

## 5. Independence

V&V independence is achieved through separate review responsibility rather than
separate organizations. One person may implement and validate a small change,
but release-impacting work must have a second reviewer, agent, or maintainer
evaluate the evidence before promotion.

| Role | Independence expectation |
| --- | --- |
| Implementer | Produces the change, local evidence, and first-pass verification. |
| V&V reviewer | Reviews requirements, design, tests, risks, and release evidence without owning the implementation details under review. |
| Data reviewer | Independently checks source scope, license, provenance, and Puerto Rico filter evidence for data changes. |
| Release reviewer | Independently checks release gates, readiness, rollback path, and open anomaly disposition. |
| Standards auditor | Checks that affected IEEE standards documents and project docs were updated with the change. |

For high-risk changes, use at least two independent review perspectives: one
focused on executable behavior and one focused on audit traceability.

## 6. Lifecycle V&V Activities

### 6.1 Concept And Requirements

Verify that new requirements or product decisions:

- Support the Puerto Rico business formation planning purpose.
- Identify affected app, API, data, migration, deployment, and documentation
  surfaces.
- Preserve known public behavior or explicitly describe the accepted behavior
  change.
- Define measurable acceptance criteria before implementation begins.
- Update the IEEE 830 SRS and modernization roadmap when scope or acceptance
  changes.

Validate the need by checking that the requirement helps users reason about
place-based business planning, deployment reliability, data trust, or project
maintainability.

### 6.2 Design

Verify that design changes:

- Keep browser requests same-origin through the app service for `/v1/*` paths.
- Keep the API implementation in typed sources under `dtoapi/modern/src/`.
- Keep public response envelopes, resource column order, route behavior, CORS,
  gzip handling, health, and readiness behavior covered by contracts.
- Keep schema changes represented by migration artifacts with preflight,
  apply, verification, rollback, and post-deploy checks.
- Keep production startup free of implicit schema mutation.
- Update the IEEE 1016 SDD and deployment documentation when topology,
  boundaries, or runtime contracts change.

Validate the design by checking that it remains operable from a clean checkout,
does not reintroduce retired runtime dependencies, and keeps demo/test paths
visibly separate from production paths.

### 6.3 Implementation

Verify implementation changes through code review and focused checks:

- Source edits match documented design boundaries.
- Generated dependency folders and compiled outputs remain out of source
  control.
- Environment parsing fails safely for production database requirements.
- Error handling avoids exposing raw database errors to clients.
- New data intake code enforces registered Puerto Rico filters.
- Planning-context and category-mapping changes stay descriptive and retain
  confidence, limitations, and unresolved-question evidence.
- Tests are added or updated with behavior changes.

Validate implementation by exercising the product path that users or operators
depend on, not only isolated units.

### 6.4 Integration

Verify the integrated request path:

```text
Browser -> app:8080 -> /v1/* proxy -> api:3001 -> PostgreSQL
Browser -> app:8080 -> static assets
```

Required integration checks:

- `npm run start:local` wires app and API with `UTOPLAN_API_ORIGIN` and waits for API `/readyz` before starting the app process.
- `/v1/unis` resolves through the app proxy from modern API data when proxy
  mode is enabled.
- `UTOPLAN_DEMO_FIXTURE=1` is required for offline fixture mode.
- API `/readyz` verifies database reachability and the current read baseline.
- App `/healthz` reports app identity, proxy state, and fixture state.

### 6.5 Qualification And Acceptance

Verify that the release candidate passes the applicable gates in section 8.
Validate that the candidate satisfies user-facing and operator-facing
acceptance criteria:

- Map-first app loads from the app origin without relying on fixture data in
  production-like environments.
- Planning-context summaries remain same-origin, descriptive, and traceable to
  candidate business-category mappings and fixture evidence.
- Seeded API read contracts pass with PostgreSQL.
- Public API behavior remains compatible unless a breaking change was approved.
- Readiness, deployment verification, and release smoke checks agree.
- Data changes are source-backed and Puerto Rico-scoped.
- Rollback and anomaly disposition are documented.

### 6.6 Operation And Maintenance

During ongoing modernization, verify that:

- Standards documents stay aligned with code, tests, scripts, topology, and
  release rules.
- Hardening and optimization recommendations are either implemented with tests
  or tracked as open risks.
- Production incidents and release blockers create or update tests, runbooks,
  migration artifacts, or standards documents.
- Dependency audit results and runtime requirements remain visible.

Validate maintenance work by confirming that it reduces project risk without
weakening reproducibility, provenance, or release confidence.

## 7. V&V Methods

| Method | Use |
| --- | --- |
| Requirements review | Confirms scope, acceptance criteria, traceability, and user/operator value. |
| Design review | Confirms architecture, data flow, runtime boundaries, migration safety, and deployment topology. |
| Code review | Confirms implementation correctness, maintainability, error handling, and interface preservation. |
| Static inspection | Checks scripts, configs, docs, source registry entries, migrations, and generated-output hygiene. |
| Unit and contract tests | Pin typed API, browser, response, resource, routing, data-source, migration, and deployment verifier behavior. |
| Integration tests | Exercise app/API/PostgreSQL and same-origin proxy behavior. |
| Browser smoke tests | Verify visible map behavior, markers, toggles, tile rendering, and clean console/page errors. |
| Docker compatibility tests | Verify clean container builds, seeded DB contracts, proxy wiring, and integrated browser behavior. |
| Release smoke tests | Verify deployed app health, public `/v1/unis`, and optional API readiness from release URLs. |
| Audit review | Confirms evidence, skipped checks, accepted risks, anomalies, and standards updates. |

## 8. Acceptance Gates

Run the narrowest relevant checks while developing, then run the full feasible
stack before PR publication or release promotion.

| Gate | Command or evidence | Required when |
| --- | --- | --- |
| Node runtime | `npm run test:node-runtime` | Runtime pin, engines, install hook, CI, Docker, or toolchain changes. |
| Clean install | `npm run install:all` | Dependency, lockfile, CI, Docker, or release changes. |
| Build baseline | `npm run build` | Code, TypeScript, script, or validation changes. |
| Root tests | `npm run test` | Normal pre-merge validation. |
| API contracts | `npm run test:api` and `npm run test:api:modern` | API behavior, response, routing, gzip, CORS, error, or DB-boundary changes. |
| Static app contracts | `npm run test:app` | Static server, proxy, fixture, health, or browser config changes. |
| Browser smoke | `npm run test:browser` | Frontend, map, asset, or browser-visible data-flow changes. |
| DB contracts | `npm run docker:test:db` | Database schema, query, readiness, seed, or migration changes. |
| Proxy contracts | `npm run docker:test:proxy` | App proxy, `/v1/*`, API origin, or integrated topology changes. |
| Integrated browser path | `npm run docker:test:start-local-browser` | Release-impacting app/API/browser/data-flow changes. |
| Data registry | `npm run test:data-sources` | Source registry, provenance, import, or data-scope changes. |
| Business category mapping | `npm run test:business-categories` | Category crosswalk, planning-context selection, or descriptive-scope changes. |
| Planning-context fixture | `npm run test:planning-context` | Planning-context fixture, summary/detail, or descriptive-guardrail changes. |
| Migration artifact | `npm run test:migration-artifacts` | Migration template, artifact, readiness schema, or rollback changes. |
| Deployment verification | `npm run verify:deployment` and `npm run verify:release` | Release, container, environment, or operator workflow changes. |
| Release smoke | `UTOPLAN_APP_URL=<url> npm run verify:release-smoke` | Candidate deployed environment. |
| Security audit | Root, `app`, `dtoapi`, and `dtoapi/modern` npm audits | Dependency or release changes. |

If Docker is unavailable, record the skipped Docker gate and reason in the
change report. Docker release gates are not replaced by host-only tests when
container topology is affected.

## 9. Traceability

Maintain traceability from requirement to design, implementation, test,
release evidence, and audit record.

| Area | Requirement source | Design source | Verification evidence |
| --- | --- | --- | --- |
| Product purpose | `README.md`, IEEE 830 SRS | IEEE 1016 SDD, roadmap | Acceptance review, browser smoke, release summary |
| Static app and map | README, roadmap | `docs/frontend-inventory.md`, IEEE 1016 SDD | `npm run test:app`, `npm run test:browser` |
| Modern API | `docs/api-modernization.md`, IEEE 830 SRS | API notes, IEEE 1016 SDD | `npm run test:api`, `npm run test:api:modern` |
| Database read baseline | `docs/database-migrations.md`, migration artifacts | `db/migrations/`, readiness design | `npm run test:migration-artifacts`, `npm run docker:test:db` |
| Deployment topology | `docs/deployment-topology.md`, production runbook | IEEE 1016 SDD | Docker proxy/browser tests, deployment verification |
| Data provenance | `docs/data-intake.md`, `docs/data-provenance.md`, `docs/data-source-schema-mapping.md` | Source registry, import design | `npm run test:data-sources`, data review |
| Planning context | `docs/product-scope.md`, candidate category mapping, NAICS title registry, planning-context fixtures | IEEE 1016 SDD, API/frontend notes | `npm run test:business-categories`, `npm run test:planning-context`, `npm run test:browser` |
| Release readiness | IEEE 730 SQA, IEEE 829 test document, production runbook | Release checklist | Release smoke, audit record, rollback review |
| Standards corpus | This plan and peer IEEE documents | Audit hooks | Standards audit and document diffs |

Each change report should identify the affected rows and list evidence for the
corresponding verification path.

## 10. Records

Keep V&V records concise and reconstructable:

- Commit or PR summary with scope, changed contracts, validations run, skipped
  checks, and residual risks.
- Test logs for failed gates, release candidates, and requested evidence
  packages.
- Migration artifacts with preflight, apply, verification, rollback, and
  post-deploy checks.
- Data registry entries and provenance notes with publisher, license, source
  URL, resource URL, Puerto Rico filter, retrieval date, target endpoint,
  candidate status, and active-table legacy mapping coverage evidence.
- Release summaries with artifact source, commit SHA, health/readiness status,
  smoke result, audit result, open anomalies, and rollback path.
- Standards update notes when accepted recommendations change governance,
  validation, release, data, or quality duties.

Recommended V&V record format:

```text
Date:
Commit:
Branch:
Scope:
Requirements affected:
Design affected:
Commands/evidence:
Result:
Skipped checks:
Open anomalies:
Accepted risks:
Recommendation:
```

## 11. Anomaly Handling

An anomaly is any observed mismatch between expected and actual behavior,
evidence, documentation, or release readiness.

### 11.1 Severity

| Severity | Meaning | Required action |
| --- | --- | --- |
| `S1` | Production app/API path unavailable, data integrity risk, or fixture data can masquerade as production. | Stop release or rollback. Owner and retest evidence required. |
| `S2` | Release blocker with known workaround, readiness failure, broken migration path, or public contract regression. | Hold promotion until fixed or explicitly accepted. |
| `S3` | Non-blocking regression in diagnostics, docs, tests, or developer workflow. | Track and schedule remediation. |
| `S4` | Hardening or optimization recommendation. | Consider for backlog or implement with evidence. |

### 11.2 Workflow

1. Record the anomaly with failing command, endpoint, expected result, actual
   result, affected item, severity, owner, and reproduction steps.
2. Stop release promotion for `S1` and `S2` anomalies.
3. Fix the issue or document explicit risk acceptance with owner and expiry.
4. Re-run the failed gate and any dependent gates.
5. Update tests, runbooks, migration artifacts, data records, or standards
   documents if the anomaly exposed a missing control.
6. Close the anomaly only after retest evidence is recorded.

Accepted risks must not silently weaken future gates. If a gate is waived, the
waiver must be visible in the release record and revisited before the next
release candidate.

## 12. Release Readiness

A release candidate is ready only when:

- The intended branch, commit, and artifact source are identified.
- Applicable gates in section 8 pass or have documented, approved exceptions.
- `npm run test` passes from the repository root.
- Docker DB, proxy, and integrated browser checks pass for release-impacting
  app, API, database, or deployment changes when Docker is available.
- API `/readyz` validates the current read baseline.
- App `/healthz` reports expected proxy state and no production fixture mode.
- Public `/v1/unis` smoke passes through the app origin.
- Source registry and migration artifact checks pass when data or schema are
  affected.
- Security audit status is known across root, `app`, `dtoapi`, and
  `dtoapi/modern`.
- No open `S1` or `S2` anomalies remain without explicit user-approved risk
  acceptance.
- Rollback triggers and rollback path are documented.
- IEEE standards and operator documents affected by the change are updated.

Release recommendation values:

- `Promote`: required evidence is complete and no blocking anomalies remain.
- `Hold`: evidence is incomplete or blocking anomalies remain.
- `Rollback`: deployed behavior violates availability, data integrity,
  readiness, or fixture-separation expectations.

## 13. Ongoing Audit Corpus Duties

This document is part of the ongoing standards corpus. It must be reviewed and
updated whenever the modernization fork accepts a recommendation that changes
verification, validation, release, data, quality, configuration, or project
management duties.

At least two reviewers or agents should evaluate this document during standards
updates:

- V&V author: checks lifecycle activities, methods, gates, records, anomalies,
  traceability, and release readiness.
- Audit reviewer: checks consistency with IEEE 730, 828, 829, 830, 1016, 1058,
  project docs, and implemented controls.

Accepted hardening and optimization recommendations should be considered for
implementation when they reduce real risk, improve reproducibility, clarify
traceability, or strengthen release confidence.

Current recommendations to track:

- Add structured JSON output to deployment and release smoke verifiers.
- Add CI artifacts for V&V records, test logs, and release summaries.
- Add explicit accessibility and performance gates when product criteria are
  defined.
- Add negative API tests for malformed IDs and unsupported collection routes.
- Add import tests before accepting production-style source refreshes.
- Add rollback rehearsal checks for database-impacting releases.
- Add a standards freshness check that flags affected IEEE documents when
  scripts, routes, data contracts, deployment topology, or release gates change.

## Audit Hooks

- Requirements hook: update this plan when project scope, acceptance criteria,
  user-facing behavior, or the IEEE 830 SRS changes.
- Design hook: update this plan when architecture, service topology, API
  contracts, data flow, migration policy, or the IEEE 1016 SDD changes.
- Test hook: update this plan when test commands, acceptance gates, browser
  smoke checks, Docker validation, release smoke checks, or IEEE 829 procedures
  change.
- SQA hook: update this plan when quality roles, audits, metrics, waiver rules,
  or IEEE 730 controls change.
- SCM hook: update this plan when branch, commit, artifact, versioning,
  baseline, or IEEE 828 configuration controls change.
- Data hook: update this plan when source registry rules, provenance evidence,
  Puerto Rico filters, import paths, or production data handling changes.
- Migration hook: update this plan when schema baselines, migration artifact
  requirements, readiness checks, rollback rules, or production apply policy
  changes.
- Release hook: update this plan when deployment verification, health,
  readiness, rollback triggers, smoke checks, or production runbooks change.
- Anomaly hook: every `S1` or `S2` anomaly must review this plan for missing or
  weak V&V controls before closure.
- Modernization hook: accepted hardening or optimization recommendations must
  update this plan when they alter validation duties, release readiness, or
  audit records.
