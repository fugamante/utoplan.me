# IEEE 829 Software Test Document

## 1. Purpose

This Software Test Document defines the test plan, test design, test cases,
test procedures, logs, incident reporting, and summary reporting used by the
`utoplan.Me` modernization fork.

The document applies to the modernization fork's current product goal: a
reproducible, testable, deployable map-first planning tool for Puerto Rico
business formation analysis. It covers the static browser app, modern
TypeScript Node API, PostgreSQL-backed read model, Docker deployment topology,
data provenance controls, release validation, and ongoing audit duties.

## 2. Scope

### 2.1 In Scope

- Root workspace install, build, and test workflows.
- Static app behavior under `app/`, including same-origin `/v1/*` proxying,
  health reporting, explicit fixture mode, and browser map smoke coverage.
- Modern API behavior under `dtoapi/modern`, including root contract,
  response envelope, resource contracts, seeded read endpoints, CORS, gzip,
  unsupported methods, database error handling, `/healthz`, and `/readyz`.
- PostgreSQL compatibility for the `baseline-read-v1` read schema.
- Docker image builds and Compose validation for app, API, proxy, seeded DB,
  and browser smoke paths.
- Puerto Rico-only source registry validation and separation of demo fixture,
  test seed, replacement candidate, and production data.
- Production deployment preflight, smoke checks, rollback triggers, and release
  summary reporting.

### 2.2 Out of Scope

- Verification of unrecovered original hackathon row-level data.
- Production migration execution, because the project currently stores
  migration artifacts but does not include a production migration runner.
- Full accessibility, performance, security, load, and usability certification.
  These areas require dedicated acceptance criteria before they can become
  formal release blockers.

## 3. Test Items

| Item | Location | Primary Risk |
| --- | --- | --- |
| Static app server | `app/app.js` | Incorrect proxy mode, fixture leakage, static asset failures |
| Browser map | `app/public/` | Missing map render, bad data fallback, console/page errors |
| Frontend TypeScript boundary | `app/public/src/` | Generated browser assets drift from typed source |
| Modern API HTTP runtime | `dtoapi/modern/src/server.ts` | Route mismatch, wrong headers, raw error exposure |
| API response contracts | `dtoapi/modern/src/*_contract.ts` | Breaking preserved endpoint shape |
| API database boundary | `dtoapi/modern/src/db.ts` | Bad environment parsing, leaked connection lifecycle |
| Seeded read endpoints | `dtoapi/modern/src/records.ts` | Wrong payloads, missing-record behavior, schema drift |
| Data source registry | `data/sources/puerto-rico.json` | Non-Puerto Rico or unlicensed source intake |
| Migration artifacts | `db/migrations/` | Missing rollback, unsafe schema change, readiness drift |
| Deployment verification | `scripts/verify_*.js` | Production starts with missing config or wrong mode |
| Release smoke checks | `scripts/release_smoke_check.js` | Public app cannot serve API-backed map data |
| Docker topology | `Dockerfile*`, `docker-compose*.yml` | Container-only regressions, network wiring failures |

## 4. Test Plan

### 4.1 Test Strategy

Use layered validation so narrow contract failures are fast and deployment
failures are still caught before release:

1. Run dependency and compile/test checks from lockfiles.
2. Run DB-free API and app contract tests on the host.
3. Run source registry, migration artifact, deployment config, and release
   verifier tests.
4. Run Docker compatibility tests for seeded Postgres, app/API proxying, and
   browser rendering through the integrated topology.
5. Run production release smoke checks against deployed URLs before promotion.

The root acceptance command is:

```sh
npm run test
```

The release preflight stack is:

```sh
npm run install:all
npm run build
npm run verify:deployment
npm run verify:release
npm run test:release-smoke
npm run test:browser
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
npm audit
npm --prefix app audit
npm --prefix dtoapi audit
npm --prefix dtoapi/modern audit
```

Docker compatibility checks are required for release candidates when Docker is
available because production behavior depends on container networking, seeded
Postgres validation, and the app/API proxy topology.

### 4.2 Acceptance Criteria

A change is test-acceptable when:

- `npm run test` passes from the repository root.
- TypeScript-generated browser and API outputs are current after source edits.
- Docker DB, proxy, and browser compatibility checks pass for release-impacting
  app, API, database, or deployment changes.
- API `/readyz` remains aligned with the current `baseline-read-v1` schema.
- App `/healthz` reports the expected proxy mode and does not report production
  fixture mode.
- `/v1/unis` is served through the same-origin app path in integrated and
  release smoke checks.
- Data source changes pass `npm run test:data-sources` and preserve
  Puerto Rico-only scope or deterministic Puerto Rico filtering.
- Migration changes include an artifact under `db/migrations/` with preflight,
  apply, verification, rollback, and post-deploy checks.

### 4.3 Suspension Criteria

Suspend test execution and file an incident when:

- Install cannot complete from lockfiles.
- The test database cannot initialize or seed deterministically.
- `/readyz` fails because the required schema is absent or unreachable.
- The app health response shows fixture mode in a production-like environment.
- Browser smoke tests show uncaught page errors, missing map data, or failed
  same-origin API requests.
- A test requires production credentials or non-public data to run locally.

### 4.4 Resumption Criteria

Resume after the blocking cause is corrected and the failing command has been
rerun with a clean result. If the incident affected release confidence, rerun
the full release preflight stack rather than only the corrected test.

## 5. Test Design Specification

### 5.1 Unit And Contract Design

Contract tests pin public behavior before implementation replacement. Add or
update these tests when endpoint shapes, response envelopes, environment
contracts, source registry rules, or migration artifact rules change.

Expected coverage includes:

- API root response, CORS, gzip, and status behavior.
- API response and error envelope serialization.
- Resource column order, row serialization, and parameterized query
  construction.
- Missing-record and unsupported-method behavior.
- Static server health, proxy, fixture gate, and static asset behavior.
- Typed browser map config normalization and endpoint selection.
- Deployment verifier behavior for app and API environments.

### 5.2 Integration Design

Integration tests prove that independently valid parts work through the product
request path:

```text
Browser -> app:8080 -> /v1/* proxy -> api:3001 -> PostgreSQL
Browser -> app:8080 -> static assets
```

Required integration assertions:

- `npm run start:local` wires app and API with `UTOPLAN_API_ORIGIN`.
- Same-origin `/v1/unis` reads from the modern API when the proxy is enabled.
- Offline fixture mode requires explicit `UTOPLAN_DEMO_FIXTURE=1`.
- API `/readyz` checks database reachability and `baseline-read-v1`.
- App `/healthz` exposes service identity, proxy state, and fixture state.

### 5.3 Browser Design

Browser validation uses Chromium smoke coverage for the first page. Required
assertions:

- Page loads without uncaught console or page errors.
- Leaflet map renders.
- Base tile layer renders.
- Layer menu and sidebar toggles respond.
- University markers render from the expected data path.
- Integrated browser smoke checks use the seeded modern API path rather than
  the offline fixture.

### 5.4 Data Design

Data validation protects provenance and scope:

- `data/sources/puerto-rico.json` is the registry for accepted replacement
  source candidates.
- Every source must include publisher, portal, license, source URL, resource or
  API URL, target legacy table or endpoint, retrieval date, candidate status,
  and source-basis note.
- Broad national datasets are blocked unless the registry and import path
  enforce a deterministic Puerto Rico filter.
- Unresolved legacy tables remain blocked for production-style import until
  source, license, and transform path are recorded.

### 5.5 Release Design

Release validation checks that the intended commit can be operated safely:

- Deployment environment is valid for the app and API.
- Production API startup fails fast without database configuration.
- `UTOPLAN_DEMO_FIXTURE` is unset in production.
- App and API artifacts come from the same release commit.
- Public app origin can serve `/v1/unis`.
- Optional API readiness URL returns healthy status from the release job
  network.

## 6. Test Case Specification

| ID | Name | Procedure | Expected Result |
| --- | --- | --- | --- |
| TC-001 | Root test baseline | `npm run test` | All host contract and verification tests pass |
| TC-002 | Clean install | `npm run install:all` | Root, app, API, and modern API install from lockfiles |
| TC-003 | Build baseline | `npm run build` | Build delegates to test baseline and passes |
| TC-004 | API contracts | `npm run test:api` | Root, response, resource, route, and DB-free contracts pass |
| TC-005 | Modern API contracts | `npm run test:api:modern` | Modern API unit and contract tests pass |
| TC-006 | DB-backed API | `npm run docker:test:db` | Seeded Postgres contracts pass and Compose stack is removed |
| TC-007 | Static app contracts | `npm run test:app` | Static server, fixture gate, proxy, config, and smoke tests pass |
| TC-008 | Browser smoke | `npm run test:browser` | Chromium map smoke passes without page or console failures |
| TC-009 | Local integrated startup | `npm run test:start:local` | Integrated startup wiring contract passes |
| TC-010 | Proxy integration | `npm run docker:test:proxy` | `/v1/unis` is served through proxy from modern API seed data |
| TC-011 | Integrated browser path | `npm run docker:test:start-local-browser` | Browser renders seeded API data through `start:local` |
| TC-012 | Deployment config | `npm run test:deployment-config` | App/API environment verifier contracts pass |
| TC-013 | Deployment containers | `npm run test:deployment-containers` | Container startup verifier contracts pass |
| TC-014 | Release preflight | `npm run test:release-preflight` | Release verifier wrapper contracts pass |
| TC-015 | Release smoke script | `npm run test:release-smoke` | Smoke-check script contracts pass |
| TC-016 | Live release smoke | `UTOPLAN_APP_URL=<url> npm run verify:release-smoke` | Public app health and `/v1/unis` smoke pass |
| TC-017 | API readiness | `curl -fsS <api-origin>/readyz` | API reports ready only with DB and schema available |
| TC-018 | App health | `curl -fsS <app-origin>/healthz` | App reports expected service, proxy state, and no fixture leakage |
| TC-019 | Source registry | `npm run test:data-sources` | Registered sources are Puerto Rico-only or explicitly filtered |
| TC-020 | Migration artifacts | `npm run test:migration-artifacts` | Migration documents include required release and rollback fields |
| TC-021 | Security audit | Run all documented `npm audit` commands | Current lockfile-backed audit reports no blocking vulnerabilities |

## 7. Test Procedure Specification

### 7.1 Local Developer Procedure

1. Install dependencies:

   ```sh
   npm run install:all
   ```

2. Run the host baseline:

   ```sh
   npm run test
   ```

3. For browser-facing changes, install Chromium once if needed and run:

   ```sh
   npx playwright install chromium
   npm run test:browser
   ```

4. For app/API/data/deployment changes, run Docker checks when Docker is
   available:

   ```sh
   npm run docker:test:db
   npm run docker:test:proxy
   npm run docker:test:start-local-browser
   ```

### 7.2 Release Candidate Procedure

1. Confirm the intended commit, branch, and artifact source.
2. Run the full release preflight stack from section 4.1.
3. Confirm production secrets are configured in the deployment platform and are
   not committed.
4. Deploy API and wait for `GET /readyz` to return `200`.
5. Deploy app and wait for `GET /healthz` to return `200`.
6. Run:

   ```sh
   UTOPLAN_APP_URL=<public-app-origin> \
   UTOPLAN_API_URL=<internal-api-origin-if-reachable> \
   npm run verify:release-smoke
   ```

7. Record the result in the release test summary.

### 7.3 Data Change Procedure

1. Update `data/sources/puerto-rico.json` before import work starts.
2. Run:

   ```sh
   npm run test:data-sources
   ```

3. Keep demo fixtures, test seed data, candidate replacement data, and
   production data visibly separated.
4. Add or update import tests before treating transformed source data as
   releaseable.

### 7.4 Database Change Procedure

1. Create or update a migration artifact under `db/migrations/`.
2. Include preflight SQL, apply SQL, read-only verification SQL, rollback, and
   post-deploy checks.
3. Run:

   ```sh
   npm run test:migration-artifacts
   npm run docker:test:db
   ```

4. Update `/readyz` schema expectations only when the modern API requires a new
   read table or column.

## 8. Test Log

Each meaningful validation run should record:

- Date and timezone.
- Operator or automation identity.
- Commit SHA and branch.
- Environment: host OS, Node version, npm version, Docker version if used.
- Commands run.
- Pass/fail status.
- Relevant URLs for live smoke checks.
- Linked incidents for any failure.
- Skipped checks with reason.

Recommended log format:

```text
Date:
Commit:
Branch:
Environment:
Commands:
Result:
Skipped:
Incidents:
Notes:
```

Release test logs should be attached to the release notes or pull request so
the exact validation surface is reviewable before merge or promotion.

## 9. Test Incident Report

Open an incident for any failed release-blocking test, production smoke failure,
fixture leakage, readiness failure, data provenance violation, or failed
rollback verification.

Incident reports must include:

- Title and severity.
- Failing command or endpoint.
- Expected result.
- Actual result.
- First known bad commit or deployment, when known.
- Reproduction steps.
- Logs or response bodies with secrets removed.
- Impacted test item.
- Triage owner.
- Resolution.
- Retest evidence.

Severity guidance:

- `S1`: Production cannot serve the app/API path, or data integrity is at risk.
- `S2`: Release blocker with known workaround or rollback.
- `S3`: Non-blocking regression in coverage, diagnostics, docs, or developer
  workflow.
- `S4`: Tracking item for hardening or optimization.

## 10. Test Summary Report

Every release candidate should produce a concise summary with:

- Release identifier and commit SHA.
- Scope of changes.
- Test commands run and final status.
- Docker compatibility status.
- Browser smoke status.
- API/database readiness status.
- Data registry and migration artifact status when applicable.
- Security audit status.
- Open incidents and accepted risks.
- Rollback readiness statement.
- Recommendation: promote, hold, or rollback.

Promotion requires zero open `S1` or `S2` incidents unless the user explicitly
accepts the risk in release notes.

## 11. Ongoing Audit Corpus Duties

This document is part of the standards corpus for the modernization fork. Keep
it current as long as the project is active.

Update this document when:

- A new public endpoint, app route, data source, deployment mode, migration
  rule, or release gate is added.
- A test command is renamed, removed, or replaced.
- The acceptance criteria for Docker, browser, API, data, or release validation
  changes.
- An incident exposes a missing test, weak oracle, unclear rollback path, or
  ambiguous ownership boundary.
- Hardening or optimization recommendations are accepted and implemented.

At least two reviewers or agents should evaluate updates to this document:

- Test owner: checks executable coverage, acceptance gates, and failure
  reporting.
- Audit owner: checks traceability to project docs, data provenance, release
  controls, and modernization risks.

## 12. Hardening And Optimization Backlog

Recommended improvements to consider and implement when scoped:

- Add CI artifacts for test logs and release summaries.
- Add structured JSON output to deployment and release smoke verifiers.
- Add explicit accessibility checks for the map-first UI.
- Add API negative tests for malformed IDs and unsupported collection routes.
- Add performance budgets for first page load and `/v1/unis` response time.
- Add dependency audit policy thresholds and documented exception handling.
- Add import tests before accepting production-style source refreshes.
- Add rollback rehearsal checks for releases that include database changes.

## 13. Audit Hooks

- Pull request hook: standards corpus must be reviewed when tests, deployment,
  data, migrations, or release procedures change.
- Release hook: attach the Test Summary Report before promoting a release
  candidate.
- Incident hook: every `S1` or `S2` incident must create or update a test case
  before closure, unless the release owner records an explicit exception.
- Data hook: any new source or import path must pass source registry validation
  and preserve Puerto Rico-only scope.
- Docker hook: app/API/database deployment-impacting changes must run Docker
  compatibility checks when Docker is available.
- Browser hook: frontend behavior changes must run browser smoke validation.
- Readiness hook: API schema changes must update `/readyz` expectations and the
  migration artifact together.
- Modernization hook: accepted hardening or optimization recommendations must
  update this document when they change validation duties.
