# IEEE 829 Software Test Document Audit Corpus

## Control Purpose

This file is the standing audit and control guide for IEEE 829 Software Test
Documentation in the utoplan.Me modernization fork. It defines the evidence,
recurring checks, quality gates, recommendation rules, and update triggers that
keep the project test corpus aligned with the modernization roadmap.

The audit scope covers all test documentation and executable evidence that
supports software quality decisions for the static app, modern TypeScript API,
PostgreSQL readiness path, deployment topology, data-source intake controls,
and release smoke checks.

## IEEE 829 Document Set

Maintain or cross-reference evidence for these IEEE 829 test document classes:

- Test plan: project-level test strategy, scope, risks, resources, schedules,
  and acceptance gates.
- Test design specification: feature or contract-level test approach, covered
  conditions, and selected techniques.
- Test case specification: inputs, expected outputs, fixtures, environment, and
  traceability to requirements or risks.
- Test procedure specification: exact command sequence, setup, teardown, and
  operator notes.
- Test item transmittal report: release candidate, commit, image, migration,
  fixture, seed data, and environment identity handed to test.
- Test log: executed command, date, actor or automation, environment, and result.
- Test incident report: failed gate, defect, regression, skipped check, or
  ambiguous result requiring action.
- Test summary report: release or audit-period decision record, passed gates,
  failed gates, residual risk, and follow-up recommendations.

The formal IEEE 829 document baseline is
`docs/standards/ieee-829-test-document.md`. If that artifact is temporarily
unavailable during an in-flight branch review, the audit may accept a clearly
named repository document, test file, CI job, or runbook section as interim
evidence and must record restoration of the formal baseline as an action item.

## Current Evidence Map

| Evidence | IEEE 829 role | Required audit question |
| --- | --- | --- |
| `README.md` root commands and Docker validation | Test plan, procedure summary | Do documented commands match executable scripts? |
| `.node-version`, `.nvmrc`, and `scripts/verify_node_runtime.js` | Test environment | Does every local, CI, and Docker test path use the reviewed Node 22 major? |
| `docs/modernization-roadmap.md` phase gates | Test plan, summary | Are active phase exit criteria covered by tests? |
| `docs/api-modernization.md` | Test design, case traceability | Are API contracts pinned before endpoint changes? |
| `docs/frontend-inventory.md` | Test design, item scope | Are browser and fixture boundaries represented in tests? |
| `docs/database-migrations.md` | Procedure, incident, release gate | Are schema changes independently reviewable and rollbackable? |
| `docs/deployment-topology.md` | Test design, item transmittal | Does test coverage exercise the app/API/private API topology? |
| `docs/production-deployment.md` | Procedure, summary, release gate | Are deployment checks runnable and release blocking? |
| `docs/data-intake.md` | Test design, quality gate | Are Puerto Rico-only source controls validated before import? |
| `data/sources/puerto-rico.json` | Test item, test data | Are source records scoped, licensed, dated, and mapped to active legacy columns where evidence exists? |
| `data/mappings/puerto-rico-business-categories.json` | Test item, test data | Do candidate business-category mappings stay descriptive and traceable to NAICS evidence without score drift? |
| `data/planning-context/*.json` | Test item, test data | Do planning-context fixtures keep fact matching, uncertainty, and unresolved questions visible without recommendation drift? |
| `db/migrations/*.md` | Test item, transmittal | Are database baselines and changes tied to readiness behavior? |
| `dtoapi/test/*.js` | API test cases | Do preserved compatibility tests cover public behavior? |
| `dtoapi/modern/test/*.js` | API test cases | Do typed contracts, errors, records, and readiness stay covered? |
| `app/test/*.js` | Frontend contract cases | Are compiled browser modules and data adapters pinned? |
| `test/browser_smoke_test.js` | Browser procedure/case | Does rendered map behavior match the public user path? |
| `scripts/verify_*.js` | Deployment procedures | Do verification scripts fail closed on invalid environment? |
| `docker-compose*.yml` and Dockerfiles | Test environment | Are container checks aligned with production topology? |

## Recurring Audit Checklist

Run this checklist whenever the test corpus is reviewed, and at minimum before a
release branch, production deployment, or merge that changes app/API behavior.

- Confirm `README.md` command inventory matches `package.json` scripts and does
  not list obsolete test commands.
- Confirm `.node-version`, `.nvmrc`, package `engines`, CI, and
  `npm run test:node-runtime` still agree on the reviewed Node major.
- Confirm every active roadmap exit criterion has executable or documented test
  evidence.
- Confirm new or changed `/v1/*`, `/healthz`, or `/readyz` behavior has API
  contract tests and release-smoke coverage where user-visible.
- Confirm planning-context API routes remain read-only and include explicit
  descriptive guardrails in contract tests.
- Confirm first-page planning-context summary rendering uses same-origin
  `/v1/planning-context` and remains descriptive in browser smoke coverage.
- Confirm database schema changes include a migration artifact, read-only
  verification SQL, rollback notes, and readiness-contract impact analysis.
- Confirm frontend map, layer, sidebar, data URL, and fixture/proxy behavior has
  either contract tests or browser smoke coverage before behavior is changed.
- Confirm demo/test fixtures are never accepted as production data evidence.
- Confirm `UTOPLAN_DEMO_FIXTURE=1` remains explicit and absent from production
  deployment documentation.
- Confirm data-source registry changes pass the Puerto Rico-only source scope
  check before import scripts or production-style data claims are accepted.
- Confirm `cbps` and `unis` registry entries include full preserved-column
  `legacySchemaMap` coverage, with notes for every non-exact mapping.
- Confirm blocked `cbps` and `unis` import candidates carry explicit
  `importReadiness` blocker records for unresolved transforms, source gaps, or
  operator dependencies.
- Confirm planning-context fixtures pass the contract test and remain
  descriptive with explicit confidence labels, source metadata, and unresolved
  questions.
- Confirm test data, seed data, and production data are identified separately in
  test procedures and release summaries.
- Confirm release smoke procedures identify the commit, image/artifact, app URL,
  optional API URL, database baseline, and result.
- Confirm skipped Docker, browser, database, or audit checks have a documented
  reason and residual risk.
- Confirm incident reports are created for failed gates, flaky tests, missing
  provenance, fixture leakage, raw database error exposure, or readiness drift.

## Quality Gates

These gates are blocking unless an explicit risk acceptance is recorded in the
test summary or release notes.

### Source And Dependency Gate

- `npm run install:all`
- `npm run build`
- `npm audit`
- `npm --prefix app audit`
- `npm --prefix dtoapi audit`
- `npm --prefix dtoapi/modern audit`

Acceptance: commands complete successfully, generated output remains in ignored
locations, and reported vulnerabilities are either fixed or documented with
scope, exploitability, and remediation owner.

### Unit And Contract Gate

- `npm run test`
- `npm run test:data-sources`
- `npm run test:planning-context`
- API contract tests under `dtoapi/test/` and `dtoapi/modern/test/`
- App contract tests under `app/test/`

Acceptance: preserved public contracts pass, new contracts are added before
behavior is relied on, and source-scope validation blocks non-Puerto Rico data
unless a deterministic Puerto Rico filter is enforced.

### Browser Behavior Gate

- `npm run test:browser`
- `npm run test:browser:start-local`
- `npm run docker:test:start-local-browser` when Docker is available

Acceptance: the map renders through the intended data path, toggles remain
usable, console/page errors fail the run, and fixture fallback is only used in
explicit demo/test modes.

### Database And Topology Gate

- `npm run test:db`
- `npm run docker:test:db`
- `npm run docker:test:proxy`
- `/readyz` verifies the current database baseline before app traffic is routed.

Acceptance: seeded PostgreSQL contract behavior matches the modern API,
same-origin app proxying reaches the API instead of fixture data, and readiness
fails when the required schema or database connection is unavailable.

### Deployment Gate

- `npm run verify:deployment`
- `npm run verify:release`
- `npm run verify:release-smoke`
- Production runbook preflight and rollback checks

Acceptance: production configuration fails closed when required values are
missing, app `/healthz` and API `/readyz` are covered by deployment policy, and
the public app origin serves `/v1/unis` through the app/API topology.

## Hardening And Optimization Recommendation Rules

Create a hardening recommendation when an audit finds one of these conditions:

- A user-visible behavior lacks an executable test or documented manual
  procedure.
- A test depends on implicit local state, unpinned external data, broad network
  access, or production secrets.
- A gate can pass while the app serves fixture data in a production-like path.
- A database or migration check can pass without proving the schema used by the
  running API.
- A release check does not identify the tested commit, image/artifact, database
  baseline, or endpoint URL.
- A failure mode exposes raw implementation details, credentials, or database
  errors to clients.
- A test is flaky, slow enough to discourage normal use, or too broad to isolate
  regressions.
- A skipped check has no owner, reason, expiration, or compensating evidence.

Recommendations must be actionable and should include:

- affected test document or executable evidence
- risk being reduced
- proposed change
- expected verification command
- rollback or removal condition when the recommendation is temporary

Prefer small hardening patches that improve determinism, fail-closed behavior,
traceability, or runtime parity. Optimization recommendations should not weaken
coverage; they should shorten feedback, reduce duplicate setup, or split slow
checks from fast contract checks while keeping the release gate intact.

## Update Triggers

Update this audit corpus, or link to a new formal IEEE 829 artifact, when any of
these changes occur:

- new endpoint, route, health check, readiness check, or response contract
- frontend behavior change to map rendering, data loading, layer controls,
  sidebar controls, or asset serving
- new dependency, runtime, framework, build step, or generated output location
- new database table, column, migration artifact, seed set, or baseline contract
- data-source registry change, import script, provenance decision, or fixture
  replacement
- deployment topology, Dockerfile, Compose file, CI workflow, environment
  variable, or release smoke change
- failed quality gate, flaky test, production incident, rollback, or accepted
  residual risk
- addition of formal IEEE 730, 828, 830, 1012, 1016, or 1058 documents that
  changes test traceability expectations

## Minimum Test Summary Template

Use this structure for release or audit-period summaries until a fuller formal
IEEE 829 summary document exists:

```text
Test item:
Commit or artifact:
Environment:
Database baseline:
Commands run:
Passed gates:
Failed or skipped gates:
Incidents:
Residual risk:
Hardening recommendations:
Release decision:
```

## Open Audit Items

- Add explicit traceability from future IEEE 830 requirements to API, frontend,
  data, and deployment test cases.
- Add a recurring test log convention for local audit runs and release
  candidates so command evidence is retained without committing transient logs.

## Active Recommendations

### RECO-829-2026-05-24-01

- Class: optimization
- Finding: IEEE 829 traceability and log conventions are still described as open
  items instead of a concrete, reusable record format.
- Acceptance evidence:
  - A documented test log location and template under `docs/standards/` or
    `docs/`.
  - One completed release-candidate or audit-period test summary that records
    commands run, environment, pass/fail gates, skipped checks, and residual
    risk.
  - Cross-reference from `docs/standards/ieee-829-test-document.md` and this
    audit corpus to the chosen log convention.
- Revisit trigger:
  - Next release-candidate bundle, or sooner if a required quality gate fails
    and incident traceability is incomplete.
- Status: proposed

### RECO-829-2026-06-01-01

- Class: required hardening
- Finding: deployed release smoke currently validates app `/healthz`,
  `/v1/unis`, and optional API `/readyz`, but not the same-origin
  `/v1/planning-context` summary/detail path that the current first page now
  uses for descriptive planning-context rendering.
- Acceptance evidence:
  - `scripts/release_smoke_check.js` validates a successful
    `GET /v1/planning-context` response from `UTOPLAN_APP_URL`.
  - `test/release_smoke_check_test.js` covers the new planning-context release
    smoke assertion and failure behavior.
  - `docs/production-deployment.md`, the IEEE 829 test document, and this audit
    corpus describe the expanded deployed smoke scope.
- Revisit trigger:
  - Before the next release candidate that treats the current first-page
    planning-context summary/detail path as part of normal public behavior, or
    sooner if `scripts/release_smoke_check.js` changes.
- Status: proposed

### RECO-829-2026-06-08-01

- Class: required documentation
- Finding: release procedures drifted by naming `npm run test:release-smoke`
  as the deployed release-smoke gate even though that command only validates
  the smoke script contract locally; the actual deployed smoke gate is
  `npm run verify:release-smoke` with release URLs set.
- Acceptance evidence:
  - `docs/production-deployment.md` lists `npm run verify:release-smoke` in the
    release-candidate preflight stack.
  - `docs/standards/ieee-829-test-document.md` uses
    `npm run verify:release-smoke` for deployed smoke procedures while keeping
    `TC-015` as the local smoke-script contract test.
  - `docs/standards/audits/ieee-730-sqa-audit.md` names
    `npm run verify:release-smoke` in the normal release-readiness validation
    stack.
- Revisit trigger:
  - Next time the release smoke script, release URL contract, or release gate
    naming changes.
- Status: implemented
