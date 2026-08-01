# IEEE 730 Software Quality Assurance Plan

## 1. Purpose

This Software Quality Assurance Plan defines the quality controls for the
`utoplan.Me` modernization fork. It applies to the static Node web app, modern
TypeScript API, PostgreSQL-backed data path, Docker deployment topology,
project documentation, and source-backed Puerto Rico data intake.

The plan is practical rather than ceremonial: every control should either
prevent a known project risk, make quality evidence reproducible, or keep the
modernization fork deployable from a clean checkout.

## 2. Scope

Covered work:

- Static app under `app/`, including first-party browser TypeScript and static
  asset serving.
- Modern API under `dtoapi/modern`, including typed HTTP, response, resource,
  database, health, and readiness contracts.
- Root scripts, CI-facing validation, release verification, and Docker
  compatibility paths.
- PostgreSQL schema baselines and migration artifacts under `db/migrations/`.
- Puerto Rico-only data source registry and provenance documentation.
- Candidate business-category mappings and descriptive planning-context
  fixtures under `data/`.
- Operator documentation under `docs/`.

Out of scope unless explicitly reintroduced:

- Retired Nodal runtime implementation.
- Production database mutation during app/API startup.
- Non-Puerto Rico data imports without an approved scope change.

## 3. Quality Objectives

- Preserve known legacy public behavior while replacing obsolete runtime
  components.
- Keep local install, build, test, CI, and Docker workflows pinned to the
  reviewed Node 26 major declared in `.node-version` and `.nvmrc`.
- Keep root install, build, test, and deployment checks reproducible from
  lockfiles.
- Prevent fixture data from being mistaken for production data.
- Keep API responses, resource columns, CORS, gzip, error envelopes, health
  checks, and readiness checks contract-tested.
- Require source, license, retrieval, scope, and target endpoint evidence before
  production-style data import work.
- Keep deployment topology explicit: browser to app origin, app proxy to private
  API, API to PostgreSQL.
- Make release risk visible through documented migration, rollback, smoke, and
  audit records.

## 4. References

- `README.md`
- `docs/modernization-roadmap.md`
- `docs/api-modernization.md`
- `docs/product-scope.md`
- `docs/business-location-decision-framework.md`
- `docs/database-migrations.md`
- `docs/data-intake.md`
- `docs/data-provenance.md`
- `docs/deployment-topology.md`
- `docs/production-deployment.md`
- `db/migrations/README.md`
- IEEE 730, Software Quality Assurance Plan standard structure.

## 5. Responsibilities

| Role | Responsibilities |
| --- | --- |
| Modernization maintainer | Owns quality gates, accepts release readiness, resolves cross-cutting quality risks, and keeps this plan current. |
| API implementer | Maintains typed API boundaries, endpoint compatibility tests, database error handling, `/healthz`, and `/readyz`. |
| Frontend implementer | Maintains static app behavior, same-origin `/v1/*` usage, browser smoke coverage, and fixture gating. |
| Data steward | Approves source registry entries, provenance notes, Puerto Rico filters, and production import readiness. |
| Database owner | Writes migration artifacts, validates rollback plans, and preserves `baseline-read-v1` readiness compatibility. |
| Release operator | Runs preflight, Docker, release smoke, health, readiness, audit, and rollback checks before promotion. |
| Documentation auditor | Verifies that standards documents and operator docs reflect changed contracts, risks, and controls. |

One person may hold multiple roles, but each release review must identify who
covered the role for the change set.

## 6. Quality Assurance Controls

### 6.1 Process Controls

- Use small, cohesive changes that preserve public interfaces unless the
  behavior change is intentional and documented.
- Keep local and CI Node runtime selection aligned with `.node-version`,
  `.nvmrc`, and `scripts/verify_node_runtime.js`.
- Keep generated dependency folders and compiled output out of source control.
- Add or update tests with behavior changes, especially around API contracts,
  deployment checks, readiness, migrations, and source intake.
- Keep production startup free of schema mutation. Database changes must be
  explicit release artifacts.
- Keep production fixture mode disabled. `UTOPLAN_DEMO_FIXTURE=1` is allowed
  only for explicit offline demos and tests.
- Update affected standards documents when project controls, risks, roles,
  metrics, or gates change.

### 6.2 Product Controls

- API routes must use typed sources under `dtoapi/modern/src/` and contract
  tests under `dtoapi/modern/test/` or project-level tests.
- Public API response shapes must remain compatible unless a breaking change is
  approved and reflected in requirements, design, test, and release documents.
- PostgreSQL read contracts must remain covered by `/readyz` and migration
  artifacts when required tables or columns change.
- Browser behavior must continue to request same-origin `/v1/*` paths through
  the static app proxy for integrated deployments.
- Data imports must use registry-approved, Puerto Rico-scoped sources with
  deterministic filters where needed.
- Geocoded import candidates must keep reviewed cache artifacts, exclusion
  quarantine artifacts, and partial import-boundary reviews in sync before
  import readiness can move to ready.
- Candidate business-category mappings and planning-context fixtures must stay
  descriptive and avoid score, ranking, or recommendation drift.
- Exposed planning-context CBP facts must use the controlled NAICS title
  registry under `data/naics/` when the source row omits title text.

### 6.3 Documentation Controls

Required documentation records:

- Requirements and roadmap changes in `docs/modernization-roadmap.md` and the
  IEEE 830 SRS.
- API behavior and compatibility notes in `docs/api-modernization.md`.
- Architecture and service topology in `docs/deployment-topology.md` and the
  IEEE 1016 SDD.
- Migration artifacts in `db/migrations/` and policy updates in
  `docs/database-migrations.md`.
- Data provenance and registry changes in `docs/data-provenance.md`,
  `docs/data-intake.md`, `data/sources/puerto-rico.json`,
  `data/mappings/puerto-rico-business-categories.json`,
  `data/municipalities/planning-context-municipalities.json`,
  `data/naics/planning-context-naics-titles.json`, and
  `data/planning-context/`.
- Product-boundary changes in `docs/product-scope.md`.
- Business-profile, decision-lens, or geographic-reach changes in
  `docs/business-location-decision-framework.md`.
- Release operations in `docs/production-deployment.md`.
- Quality evidence, audits, and update cadence in this plan.

## 7. Verification And Validation Gates

Run the narrowest relevant checks during development, then run the full feasible
validation stack before release or PR publication.

| Gate | Command or evidence | Required when |
| --- | --- | --- |
| Node runtime | `npm run verify:node && npm run test:node-runtime` | Runtime pin, engines, install hook, CI, Docker, npm lifecycle configuration, or toolchain changes. The first command verifies the active process; the second unit-tests the verifier contract. |
| Clean install | `npm run install:all` | Dependency, lockfile, CI, Docker, or release changes. |
| Build baseline | `npm run build` | Any code or validation-script change. |
| Root tests | `npm run test` | Normal pre-merge validation. |
| API contracts | `npm run test:api` and `npm run test:api:modern` | API behavior, response, routing, gzip, CORS, error, or DB boundary changes. |
| DB contracts | `npm run docker:test:db` | Database schema, query, readiness, or migration changes. |
| Proxy contracts | `npm run docker:test:proxy` | App proxy, `/v1/*`, API origin, or integrated topology changes. |
| Browser smoke | `npm run test:browser`, `npm run test:browser:start-local`, and `npm run docker:test:start-local-browser` | Frontend, map, asset, proxy, or local-start changes. The host-native `test:browser:start-local` path must honor explicit `TEST_DATABASE_*` settings, otherwise provision the seeded Compose `db` service and ignore ambient database environment variables unless the operator explicitly opts into a known baseline-ready database. |
| Data registry | `npm run test:data-sources` | Source registry, provenance, import, or data-scope changes. |
| Business category mapping | `npm run test:business-categories` | Category crosswalk, planning-context selection, or descriptive-scope changes. |
| Planning-context fixture | `npm run test:planning-context` | Planning-context fixture, summary/detail, or descriptive-guardrail changes. |
| Planned profile/reach contract | `npm run test:profile-reach-contract` plus `npm run test:planning-context` when fixtures expand | Business-profile schema, decision-lens relevance, reach, or scale-scenario changes. |
| Migration contract | `npm run test:migration-artifacts` | Migration template or artifact changes. |
| Deployment config | `npm run verify:deployment` and `npm run verify:release` | Release, environment, container, or operator workflow changes. |
| Release smoke | `npm run verify:release-smoke` | Candidate deployed environment; `UTOPLAN_RELEASE_SMOKE_JSON=1` emits sanitized structured evidence when needed. |
| Security audit | Root, `app`, `dtoapi`, and `dtoapi/modern` npm audits | Dependency or release changes. |

If Docker is unavailable, record the skipped Docker gate and the reason in the
change report. Host-native checks do not replace Docker topology validation for
release readiness.

## 8. Records And Evidence

Keep quality evidence lightweight but reconstructable:

- Commit or PR description listing changed contracts, validations run, skipped
  checks, and residual risks.
- Test output from required gates when failures occur or when release evidence
  is requested.
- Migration artifacts with preflight, apply SQL, verification SQL, rollback,
  and post-deploy checks.
- Data registry entries with publisher, license, URLs, Puerto Rico filter,
  retrieval date, target endpoint, and candidate status.
- Release notes identifying app/API artifact pair, database baseline, smoke
  result, and rollback path.
- Audit notes for any accepted risk, production incident, failed readiness
  check, or post-release defect.

## 9. Audits

### 9.1 Change Audit

For every meaningful code, data, deployment, or documentation change, verify:

- The changed behavior has an owner and a test or documented manual check.
- Public API or UI behavior is preserved or the intentional change is recorded.
- Fixture, seed, demo, and production data remain separated.
- Required docs and standards documents are updated in the same change bundle.
- New risks are either mitigated, tracked, or explicitly accepted.

### 9.2 Release Audit

Before release promotion, verify:

- App and API artifacts were built from the intended commit.
- Required production environment values and secrets are configured outside
  source control.
- API `/readyz` enforces the current database baseline.
- App `/healthz` confirms proxy mode and not fixture mode.
- Public `/v1/unis` and `/v1/planning-context` smoke paths work through the
  app origin.
- Rollback artifact pair and database rollback note are known.

### 9.3 Data Audit

Before accepting new production-style data:

- The source is in `data/sources/puerto-rico.json`.
- Puerto Rico scope or deterministic Puerto Rico filtering is documented and
  enforced.
- License and retrieval evidence are recorded.
- Transform assumptions are reviewed against legacy endpoint schemas.
- Demo/test seed data cannot overwrite or masquerade as production data.
- Geocoded sources cannot be marked import-ready unless reviewed coordinate
  cache evidence, explicit quarantine records, and any partial import-boundary
  decision account for excluded rows.

## 10. Metrics

Track these metrics in PR notes, release notes, or a future quality dashboard
when practical:

- Required gate pass/fail status for each release candidate.
- Number of skipped checks and documented reasons.
- Open provenance gaps by legacy table or endpoint.
- Open migration artifacts awaiting production apply.
- API contract coverage for active public endpoints.
- Browser smoke coverage for map load, marker rendering, console errors, and
  same-origin data flow.
- Dependency audit vulnerability count across root, `app`, `dtoapi`, and
  `dtoapi/modern`.
- Release rollback or readiness failures by cause.
- Standards documents stale after a related code or process change.

## 11. Nonconformance Handling

When a quality gate fails:

1. Stop release promotion for affected artifacts.
2. Record the failed gate, affected scope, and suspected cause.
3. Fix the defect or document an explicit accepted risk with owner and expiry.
4. Re-run the failed gate and any dependent gates.
5. Update tests, docs, or standards if the failure exposed a missing control.

Production defects must also update the relevant runbook, test, migration
artifact, source registry, or standard so the same failure mode is harder to
repeat.

## 12. Update Cadence

- Update this plan in the same change set as any new quality gate, release gate,
  data governance rule, migration policy, role, metric, or audit obligation.
- Review this plan at each phase-gate change in `docs/modernization-roadmap.md`.
- Review this plan before any production release and after any rollback,
  incident, or accepted quality waiver.
- Keep this plan aligned with the IEEE 828 SCM plan, IEEE 829 test document,
  IEEE 830 SRS, IEEE 1016 SDD, IEEE 1012 V&V plan, and IEEE 1058 project
  management plan as those documents are created or revised.

## Audit Hooks

Future project changes must update this document when they:

- Add, remove, rename, or change required npm, Docker, release, audit, browser,
  API, data, migration, health, or readiness checks.
- Change app/API deployment topology, production environment contract,
  readiness behavior, health behavior, proxy behavior, or fixture policy.
- Add public endpoints, modify response contracts, change database read
  requirements, or alter typed API boundaries.
- Add migration runners, new migration artifact requirements, or destructive
  schema-change policy.
- Add data sources, import scripts, provenance rules, source-scope exceptions,
  or production data handling requirements.
- Change project roles, ownership, review policy, release policy, or quality
  metrics.
- Accept, retire, or discover risks that affect quality assurance controls.
- Update related IEEE standards documents in a way that changes SQA
  responsibilities, evidence, audits, or cadence.
