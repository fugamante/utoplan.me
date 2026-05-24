# IEEE 1058 Software Project Management Plan

## 1. Purpose

This Software Project Management Plan defines how the `utoplan.Me`
modernization fork is planned, staffed, governed, validated, released, and
audited. It follows IEEE 1058 intent in a practical form for an active
modernization project rather than a ceremonial one-time plan.

The plan applies to the static map-first app, modern TypeScript API,
PostgreSQL-backed read model, Docker deployment topology, Puerto Rico data
source governance, standards documentation, and ongoing release operations.

## 2. Scope

Covered work:

- Modernization of the original hackathon prototype into a reproducible,
  testable, deployable planning tool for Puerto Rico business formation.
- Static app work under `app/`, including same-origin `/v1/*` proxying,
  explicit fixture mode, browser behavior, and health checks.
- Modern API work under `dtoapi/modern/`, including typed contracts, database
  access, route behavior, health, readiness, and error handling.
- PostgreSQL schema baselines, migration artifacts, and release readiness
  checks under `db/migrations/`.
- Puerto Rico-only data source intake, provenance, registry, and import
  readiness controls.
- CI, Docker, local development, production deployment, rollback, release
  smoke, and security-audit workflows.
- IEEE standards documents and audit files under `docs/standards/`.

Out of scope unless explicitly approved:

- Reinstating the retired Nodal API runtime as an active dependency.
- Production database mutation during app or API startup.
- Production-style imports from sources without documented license,
  provenance, scope, retrieval, and transform evidence.
- Non-Puerto Rico data scope.

## 3. References

- `README.md`
- `docs/modernization-roadmap.md`
- `docs/api-modernization.md`
- `docs/frontend-inventory.md`
- `docs/deployment-topology.md`
- `docs/production-deployment.md`
- `docs/database-migrations.md`
- `docs/data-intake.md`
- `docs/data-provenance.md`
- `db/migrations/README.md`
- `db/migrations/202605211200_baseline_read_v1.md`
- `docs/standards/ieee-730-sqa-plan.md`
- `docs/standards/ieee-828-scm-plan.md`
- `docs/standards/ieee-829-test-document.md`
- `docs/standards/ieee-830-srs.md`
- IEEE 1058, Software Project Management Plan standard structure.

## 4. Project Overview

`utoplan.Me` is a modernization fork of a Puerto Rico Cuenta Hackathon project.
The product vision is a map-first roadmap and decision-support tool that helps
founders, investors, planners, and local development teams evaluate where a
business idea can take root in Puerto Rico.

The current management objective is to keep the modernization fork moving from
legacy prototype to reliable foundation:

- Preserve known public behavior where it is understood.
- Replace obsolete runtime components with a current Node and TypeScript API.
- Keep the browser app using same-origin `/v1/*` requests through the app
  service.
- Keep the API private behind the app proxy in integrated deployments.
- Establish PostgreSQL-backed readiness and migration discipline.
- Separate demo fixture, test seed, candidate source, and production data.
- Rebuild data coverage only from source-backed Puerto Rico records.
- Maintain standards documents as the auditing corpus for ongoing work.

## 5. Project Organization

| Role | Responsibilities |
| --- | --- |
| Modernization maintainer | Owns project direction, scope control, merge readiness, standards currency, and risk acceptance. |
| Product owner | Maintains product intent, user needs, data scope, and requirement priority. |
| Technical lead | Owns architecture, API/app boundaries, release topology, and technical tradeoffs. |
| API implementer | Maintains `dtoapi/modern`, typed contracts, database access, `/healthz`, `/readyz`, and API tests. |
| Frontend implementer | Maintains `app`, browser map behavior, static serving, proxy mode, fixture gate, and browser smoke coverage. |
| Data steward | Owns Puerto Rico source registry, provenance evidence, license checks, source filters, and import readiness. |
| Database owner | Owns schema baselines, migration artifacts, readiness compatibility, rollback notes, and DB validation. |
| QA/V&V owner | Owns quality gates, test evidence, verification planning, validation checks, and incident follow-up. |
| SCM owner | Owns branch hygiene, configuration items, release baselines, lockfiles, artifacts, and public repository hygiene. |
| Release operator | Owns release preflight, deployment checks, smoke tests, rollback execution, and release records. |
| Documentation auditor | Keeps IEEE and project docs aligned with implementation, controls, risks, and audit findings. |

One person or agent may hold multiple roles, but each cohesive change bundle
must make clear who covered the relevant responsibilities.

## 6. Management Process

### 6.1 Lifecycle Model

The modernization fork uses an incremental, evidence-gated lifecycle:

1. Discover current behavior, data provenance, and deployment constraints.
2. Stabilize reproducible install, build, test, and start workflows.
3. Preserve public app/API behavior with tests before replacing internals.
4. Replace obsolete components in small, contract-preserving increments.
5. Harden deployment, health, readiness, migration, and rollback controls.
6. Expand source-backed Puerto Rico data coverage through the approved registry.
7. Release only from validated commits with documented residual risk.
8. Feed audit findings back into the roadmap, standards documents, and backlog.

Large rewrites are avoided unless the validation surface is already pinned and
the rollback path is explicit.

### 6.2 Planning Cadence

Planning operates through coherent work bundles rather than excessive status
turns. Each bundle should identify:

- Objective and expected product or operational outcome.
- Affected configuration items.
- Requirements, design, test, quality, V&V, and release documents to update.
- Applicable validation commands.
- Known risks, skipped checks, and rollback considerations.
- Whether the change should be released independently or grouped.

The roadmap remains the phase-level planning record. IEEE documents provide
the control framework and audit checklist for each bundle.

### 6.3 Work Authorization

Authorized work must fit at least one active modernization objective:

- Preserve or clarify known public behavior.
- Reduce obsolete dependency, runtime, deployment, or security risk.
- Improve reproducibility, testability, readiness, or rollback safety.
- Establish source-backed Puerto Rico data coverage.
- Improve operator documentation or standards traceability.
- Fix a validated defect or audit finding.

Production mutation, shared-history rewrite, public push, release promotion,
or branch cleanup requires explicit operator intent.

## 7. Work Breakdown Structure

| WBS | Work Package | Primary outputs |
| --- | --- | --- |
| 1.0 | Project governance | Roadmap, IEEE standards corpus, audit records, risk register entries |
| 2.0 | Static app modernization | `app/` server, first-party browser TypeScript, static assets, map smoke tests |
| 3.0 | API modernization | `dtoapi/modern/` TypeScript runtime, response/resource contracts, API tests |
| 4.0 | Database and migrations | PostgreSQL schema baseline, migration artifacts, readiness checks |
| 5.0 | Data provenance and intake | `data/sources/puerto-rico.json`, provenance notes, source filters, import candidates |
| 6.0 | Test and V&V | Host tests, Docker tests, browser smoke, release smoke, validation evidence |
| 7.0 | Deployment and operations | Dockerfiles, Compose topology, health/readiness, release preflight, rollback runbooks |
| 8.0 | Security and dependency hygiene | Lockfile audits, secret handling, raw error controls, public repo hygiene |
| 9.0 | Release management | Release baseline, artifact pairing, smoke results, rollback evidence |
| 10.0 | Continuous audit | Standards updates, audit hooks, findings, recommendations, implemented hardening |

## 8. Schedule And Milestones

The active schedule follows the modernization roadmap phases and should be
re-baselined when phase exit criteria change.

| Milestone | Exit criteria |
| --- | --- |
| Baseline and hygiene | Root scripts exist; static server starts; initial test/runtime constraints are documented. |
| Dependency reproducibility | Lockfiles are authoritative; generated dependency trees are not tracked; clean Docker build validates install and build. |
| API compatibility | Public read behavior is contract-tested; legacy runtime behavior needed for active endpoints is preserved in the modern API. |
| Static app stabilization | First-party frontend ownership is clear; browser smoke proves map load and marker rendering. |
| Framework/runtime replacement | Modern API serves preserved contracts; obsolete API runtime is retired from the normal dependency graph. |
| TypeScript adoption | Active API and first-party browser boundaries compile from typed source. |
| Deployment hardening | App/API topology, health, readiness, production config checks, and rollback triggers are documented and tested. |
| Data replacement readiness | Puerto Rico source registry entries map to preserved schemas with license, scope, retrieval, and transform evidence. |
| Release candidate | Required validation stack passes or skipped checks are explicitly justified; release and rollback records are complete. |

Schedule risk is managed by limiting each bundle to a validation surface that
can be tested before merge or release.

## 9. Resource Management

Project resources:

- Source repository and Modernization fork.
- Node runtime and npm lockfiles across root, `app`, `dtoapi`, and
  `dtoapi/modern`.
- Docker and Compose for seeded database, proxy, integrated, and browser
  compatibility validation.
- PostgreSQL for read model validation and future production deployment.
- Browser automation for map smoke checks.
- IEEE standards documents and audits as persistent management evidence.
- Public Puerto Rico source portals and documented data registries.

Resource constraints:

- Docker may be unavailable on some machines; skipped Docker validation must be
  reported and cannot be treated as release-equivalent.
- Production credentials and secrets must remain outside source control.
- Fixture and seed data are not production substitutes.
- Agents and contributors may work concurrently; ownership boundaries must be
  respected and unrelated edits must not be reverted.

## 10. Budget And Effort Control

The project uses effort controls rather than a formal monetary budget:

- Prefer cohesive bundles that share one validation surface.
- Avoid mixing unrelated refactors with behavior, dependency, or data changes.
- Run focused checks while editing and the broader feasible stack once at the
  end of the bundle.
- Prefer Docker compatibility validation for release-impacting changes when
  Docker is available.
- Track skipped checks and residual risks in final reports, PRs, or release
  records.
- Convert repeated manual checks into scripts when the same evidence is needed
  across releases.

## 11. Risk Management

| Risk | Impact | Management action |
| --- | --- | --- |
| Fixture data treated as production | Bad planning conclusions and release false confidence | Keep `UTOPLAN_DEMO_FIXTURE=1` explicit, blocked in production, and covered by health/deployment checks. |
| API contract drift | Browser or consumer regressions | Preserve typed response/resource contracts and DB-backed endpoint tests. |
| Schema drift | Runtime readiness failures or wrong records | Require migration artifacts and `/readyz` baseline checks. |
| Unverified source provenance | Unsupported product claims | Require registry, license, retrieval, scope, and transform evidence before import. |
| Docker-only regression | Release works locally but fails in topology | Run seeded DB, proxy, and browser Docker tests for release-impacting changes. |
| Secret or identity leakage | Public repository hygiene failure | Keep secrets out of source; inspect branch names, commits, and PR text before push. |
| Concurrent agent edits | Lost work or inconsistent docs | Inspect status before edits, keep ownership scoped, and never revert unrelated changes. |
| Dependency vulnerability | Security or operational exposure | Run lockfile-backed audits across root, app, API, and modern API on dependency/release changes. |
| Stale standards documents | Audit evidence no longer reflects reality | Update affected IEEE documents in the same bundle as control, behavior, or risk changes. |

Risk responses are: mitigate through tests or controls, defer with an owner and
reason, accept explicitly for a release, or block the release.

## 12. Quality, Configuration, Test, And V&V Integration

Project management relies on the standards corpus as the control system:

- IEEE 730 defines quality objectives, assurance controls, metrics, and
  nonconformance handling.
- IEEE 828 defines configuration items, baselines, branch/fork hygiene, change
  control, and release identification.
- IEEE 829 defines test strategy, test items, acceptance criteria, procedures,
  logs, incidents, and summary reporting.
- IEEE 830 defines product requirements, constraints, external interfaces, and
  acceptance criteria.
- IEEE 1016 defines design structure and architectural decisions when present.
- IEEE 1012 defines verification and validation planning when present.
- This IEEE 1058 plan coordinates scope, roles, schedule, resources, risks,
  communications, and release governance across those documents.

Each implementation bundle should update the documents whose contracts it
changes. Documentation-only bundles must still remain consistent with current
source behavior and validation paths.

## 13. Communications Management

Required communication records:

- Change summary listing the objective, changed files, validation run, skipped
  checks, and residual risks.
- PR or release note for public-facing behavior, dependency, topology, schema,
  or data-source changes.
- Audit note for accepted risks, failed gates, incidents, or deferred
  hardening recommendations.
- Standards document update when project controls or acceptance gates change.

Communication rules:

- Use concise, technical, evidence-first status.
- State exact commands and results when reporting validation.
- Use concrete dates for release, migration, or audit events.
- Keep public branch names, commit subjects, PR titles, docs, and release notes
  free of personal identifiers and AI/tool/vendor labels.
- Treat recommendations from audits as backlog candidates until accepted; once
  accepted, implement them through the same change-control and validation path
  as any other work.

## 14. Configuration And Modernization Fork Policy

The Modernization fork is the permanent working line for this project. All
standards, audits, implementation, and release control updates are committed to
that fork unless the operator explicitly directs otherwise.

Fork policy:

- Keep one branch per coherent bundle where possible.
- Use neutral, domain-focused branch names.
- Preserve concurrent edits and avoid reverting unrelated work.
- Keep generated dependency folders, credentials, local environment files,
  temporary logs, and compiled ignored output out of source control.
- Commit lockfile changes only when dependency intent changes.
- Record database schema changes as migration artifacts instead of startup
  side effects.
- Treat release baselines as commit, app artifact, API artifact, database
  baseline, environment configuration, and validation evidence.
- Before pushing, inspect branch name, commit metadata, commit subjects, and PR
  text for public hygiene.

## 15. Release Management

### 15.1 Release Entry Criteria

A release candidate must identify:

- Source commit and branch.
- App and API artifact pairing.
- Database baseline and migration status.
- Required environment values and secret source.
- Validation commands run and results.
- Skipped checks and reasons.
- Known risks and rollback path.

### 15.2 Release Validation

Use the applicable release stack:

```sh
npm run install:all
npm run build
npm run test
npm run test:browser
npm run verify:deployment
npm run verify:release
npm run verify:release-smoke
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
npm audit
npm --prefix app audit
npm --prefix dtoapi audit
npm --prefix dtoapi/modern audit
```

For narrow documentation-only changes, validation may be limited to document
review and repository status inspection. For release-impacting app, API,
database, deployment, data, dependency, or security changes, skipped checks
must be justified.

### 15.3 Release Exit Criteria

Release promotion is acceptable when:

- App `/healthz` and API `/healthz` behave as expected.
- API `/readyz` verifies database reachability and the required schema
  baseline.
- Public app origin serves `/v1/unis` through the app path.
- Production fixture mode is disabled.
- Rollback artifact pair and database rollback note are known.
- Release evidence is recorded.

## 16. Metrics And Tracking

Track these project management indicators when practical:

- Roadmap phase status and open exit criteria.
- Required gates passed, failed, or skipped per bundle.
- Open risks by owner and disposition.
- Open audit recommendations and implementation status.
- Standards documents affected by recent changes.
- Number of unresolved data provenance gaps by endpoint or table.
- Dependency audit vulnerability count across controlled npm workspaces.
- Migration artifacts awaiting production application.
- Release smoke failures by cause.
- Rollback or incident count by release.

## 17. Issue, Incident, And Change Handling

Issues and incidents should be classified as:

- Defect: observed behavior fails a requirement or preserved contract.
- Nonconformance: a process, documentation, validation, or release control was
  skipped or violated.
- Risk: a plausible future failure that needs mitigation or acceptance.
- Enhancement: an improvement that does not correct a defect.
- Audit recommendation: a hardening or optimization candidate from standards
  review.

Handling path:

1. Record the symptom, affected configuration items, and impact.
2. Assign an owner and risk level.
3. Decide whether release is blocked.
4. Implement the fix or mitigation through normal change control.
5. Run the applicable validation set.
6. Update affected standards, runbooks, and roadmap records.
7. Close with residual risk or follow-up noted.

## 18. Audit Hooks

Use these prompts during recurring audits, PR review, release readiness, and
post-incident review:

- Has the work stayed inside the active modernization scope and Puerto Rico
  data boundary?
- Are the assigned roles clear for product, technical, QA/V&V, SCM, data,
  database, release, and documentation ownership?
- Does the bundle map to an active roadmap phase, requirement, risk, defect, or
  audit recommendation?
- Were affected IEEE documents updated in the same bundle as any changed
  control, requirement, design, validation gate, release path, or risk?
- Are app, API, database, data, Docker, and release configuration items
  traceable to the source commit?
- Are fixture, seed, candidate, and production data still separated?
- Does `/readyz` still enforce the current schema baseline?
- Does the browser still use same-origin `/v1/*` through the app service in
  integrated deployments?
- Are Docker compatibility checks required, and if skipped, is the reason
  recorded?
- Are security audits, dependency changes, and public repository hygiene checks
  current for the bundle?
- Are release entry criteria, validation evidence, rollback path, and residual
  risks documented?
- Have accepted audit recommendations been converted into tracked work and
  implemented through normal validation before being marked complete?
