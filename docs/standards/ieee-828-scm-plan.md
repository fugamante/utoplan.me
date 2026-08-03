# IEEE 828 Software Configuration Management Plan

## 1. Purpose

This Software Configuration Management Plan defines how the utoplan.Me modernization fork identifies, controls, records, audits, and releases configuration items. It applies to source code, documentation, infrastructure files, database migration artifacts, lockfiles, Docker assets, test fixtures, and release evidence used to modernize the original hackathon prototype into a reproducible app/API platform.

The plan follows IEEE 828 intent in a practical form for this repository. Its operating goal is to keep every project state traceable from source commit to build artifact, deployment environment, database baseline, and validation result.

## 2. Scope

This plan covers the active modernization fork and all controlled work under the repository root.

Controlled configuration domains:

- Static app source and assets under `app/`.
- Modern API source, contracts, and tests under `dtoapi/modern/`.
- Root, app, API, and modern API package manifests and lockfiles.
- Runtime version pins and verifier scripts such as `.node-version`, `.nvmrc`,
  and `scripts/verify_node_runtime.js`.
- Dockerfiles, Compose files, CI pipeline files, and deployment scripts.
- Database migration artifacts under `db/migrations/`.
- Data source registry and provenance records under `data/` and `docs/`.
- Candidate business-category mappings and planning-context fixtures under
  `data/`.
- The versioned profile/reach contract, decision-signal registry, and reviewed
  signal evidence artifacts under `data/profile-reach/`.
- Standards documents under `docs/standards/`.
- Production deployment, release, rollback, and readiness documentation.

Generated dependency directories, compiled output, local environment files, credentials, exported platform configuration, and temporary logs are not configuration items unless explicitly promoted through a reviewed artifact.

## 3. References

- IEEE 828, Software Configuration Management.
- `README.md`.
- `docs/modernization-roadmap.md`.
- `docs/api-modernization.md`.
- `docs/frontend-inventory.md`.
- `docs/product-scope.md`.
- `docs/database-migrations.md`.
- `docs/deployment-topology.md`.
- `docs/production-deployment.md`.
- `docs/data-intake.md`.
- `docs/data-provenance.md`.

## 4. Organization And Responsibilities

The modernization fork is the controlled working line for active changes. Contributors and agents may work concurrently, so each change owner is responsible for preserving unrelated edits and keeping patches scoped to assigned files or agreed work areas.

Configuration responsibilities:

- Change author: identifies affected configuration items, keeps changes cohesive, updates related documentation, and runs the applicable validation set.
- Reviewer: verifies scope, traceability, migration safety, release impact, and rollback clarity before merge.
- Release operator: promotes only validated commits or images, records release evidence, applies database changes outside service startup, and owns rollback execution.
- Documentation auditors: keep standards documents aligned with repository behavior and use the Audit Hooks section of each standard as the recurring review entrypoint.

No contributor should revert another contributor's work without explicit instruction or a documented recovery action.

## 5. Configuration Identification

### 5.1 Configuration Items

Primary configuration items:

- `package.json` and `package-lock.json` at the root, `app/`, `dtoapi/`, and `dtoapi/modern/`.
- TypeScript and JavaScript source files used by the app and API.
- Committed browser JavaScript generated from app TypeScript because it is served directly by `app/public/index.html`.
- Tests under root, `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and browser smoke tests.
- Dockerfiles and Compose files, including seeded DB, proxy, integrated,
  browser validation, and optional public API exposure variants.
- CI pipeline files.
- Migration artifacts in `db/migrations/`.
- Source registry records such as `data/sources/puerto-rico.json`.
- Controlled municipality display-name registry records such as
  `data/municipalities/planning-context-municipalities.json`.
- Controlled NAICS title registry records such as
  `data/naics/planning-context-naics-titles.json`.
- Candidate business-category mappings and planning-context fixtures under
  `data/`.
- Product, deployment, provenance, and standards documentation, including the
  canonical business-location decision framework and production-readiness
  decision board.

Secondary configuration evidence:

- Test command output summarized in PRs or release notes.
- Image tags, commit SHAs, and deployment environment identifiers.
- Database backup identifiers and migration execution records.
- Release smoke results for app `/healthz`, public `/v1/unis`, public
  `/v1/planning-context`, and optional API `/readyz`.

### 5.2 Naming And Version Identification

Source versions are identified by Git commit SHA. Public-facing branch names, commit messages, PR titles, and release notes must avoid personal identifiers and AI/tool/vendor labels. Prefer domain-focused branch names such as `modernization/data-intake`, `modernization/release-controls`, or `release/smoke-checks`.

Migration artifacts use timestamped names under `db/migrations/`, for example `202605211200_baseline_read_v1.md`. New migration artifacts must use the repository template and include compatibility, apply, verify, rollback, and post-deploy sections.

Runtime baselines are named by contract, not by environment accident. The current API readiness baseline is `baseline-read-v1`.

## 6. Baseline Management

### 6.1 Development Baseline

The development baseline is the current modernization branch plus all committed lockfiles and tests. A development baseline is acceptable when:

- Root installation can be reproduced from lockfiles.
- `npm run verify:node` confirms the active process uses the Node 26 major from
  `.node-version` and `.nvmrc`, and `npm run test:node-runtime` passes the
  verifier's unit contract.
- `npm run build` has defined behavior.
- Affected contract tests pass or failures are documented.
- Documentation changed by the work reflects the actual behavior.

### 6.2 Integration Baseline

The integration baseline is a merge-ready commit that passes the repository validation stack appropriate to the change. For app/API changes, this includes root build/test coverage and Docker validation when Docker is available.

Minimum integration checks for broad changes:

```sh
npm run install:all
npm run build
npm run test
npm run test:browser
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
```

Run narrower checks only when the change is narrow and the skipped checks are not materially affected. Skipped checks must be stated in the final change report or PR.

### 6.3 Release Baseline

A release baseline is a specific commit, app artifact, API artifact, database baseline, and environment configuration set that can be promoted and rolled back as a unit.

Release candidates must satisfy:

- App and API artifacts are built from the same intended commit.
- Production configuration verification passes.
- API `/readyz` verifies the required database contract.
- App `/healthz` confirms proxy mode and does not indicate fixture mode.
- Public `/v1/unis` and `/v1/planning-context` are served through the app
  origin.
- Database migration and rollback notes are present when data shape changes.
- When API exposure is public, external API smoke checks and edge controls are verified.

## 7. Branch And Fork Practice

The Modernization fork is the permanent home for modernization work. Work should be organized into one branch per cohesive bundle and merged only after validation evidence is recorded.

Branch rules:

- Use neutral branch names that describe the domain and avoid personal or tool labels.
- Keep each branch focused on a single validation surface where possible.
- Do not mix unrelated refactors, generated churn, and behavior changes.
- Preserve concurrent changes by inspecting `git status` before editing and before final reporting.
- Do not force-push, rewrite shared history, or delete visible branches without explicit approval and a recovery point.

Before public push or PR:

- Inspect branch name, commit author metadata, latest commit subjects, and PR text for public hygiene.
- Confirm no credentials, generated environment dumps, dependency directories, or private identifiers are included.
- Confirm lockfile changes are intentional and match manifest changes.

## 8. Change Control

### 8.1 Change Classes

Changes are classified by risk:

- Documentation-only: standards, runbooks, inventories, and planning records.
- Contract-preserving implementation: source changes that maintain existing public behavior.
- Contract-changing implementation: endpoint, data shape, UI behavior, or deployment behavior changes.
- Infrastructure: Docker, CI, deployment, environment, build, and release control changes.
- Database/data: schema, seed, provenance, registry, migration, or import changes.

### 8.2 Approval Expectations

Documentation-only changes require consistency with current source behavior. Implementation, infrastructure, and database changes require targeted validation. Contract-changing and database changes require explicit documentation of compatibility, rollout, and rollback.

Mutating operations against production, shared history, or public remotes require explicit operator intent. Service startup must not mutate production schema.

### 8.3 Change Request Content

Each meaningful change should be traceable to:

- Purpose and affected configuration items.
- Compatibility impact.
- Validation commands and results.
- Migration impact, if any.
- Release or rollback notes, if operational behavior changes.
- Documentation updates required by the change.

## 9. Environment Configuration Control

### 9.1 Local Development

Local development uses the root scripts documented in `README.md`. Developers may run the app and API together with:

```sh
npm run start:local
```

Local install, build, and test workflows are pinned to the reviewed Node 26
major declared in `.node-version` and `.nvmrc`. `scripts/verify_node_runtime.js`
enforces that pin before install, test, build, and start commands run.

Manual local service mode uses:

```sh
PORT=3001 npm run start:api:modern
UTOPLAN_API_ORIGIN=http://127.0.0.1:3001 PORT=8080 npm run start:app
```

Local `.env` files, shell exports, and machine-specific tool state are not committed configuration items.

### 9.2 Test And CI

CI and local validation must install from committed lockfiles. Docker test paths are preferred for database and integrated topology compatibility because the production architecture depends on app/API separation and PostgreSQL reachability.

The authoritative npm security gate is lockfile-backed audit coverage across the root, `app`, `dtoapi`, and `dtoapi/modern`.

### 9.3 Production

Production runs two Node services:

- `app`: static frontend and same-origin `/v1/*` proxy.
- `api`: modern TypeScript API connected to PostgreSQL.

The API remains private to the service network. Browser traffic should reach only the app origin. Production must not enable `UTOPLAN_DEMO_FIXTURE`.

If external consumers require direct API access, API exposure must be explicit
through `UTOPLAN_API_EXPOSURE=public` and a valid `UTOPLAN_PUBLIC_API_URL`.
Public exposure requires documented edge controls (auth policy, rate limiting,
WAF, and request logging) in release evidence.

Production secrets must come from the deployment platform secret store and must not be committed. API startup intentionally fails when production database configuration is missing.

## 10. Docker And Lockfile Control

Lockfiles are controlled artifacts and must be updated only when dependency intent changes. Manifest and lockfile changes should be reviewed together.

Docker assets are controlled artifacts:

- `Dockerfile` validates clean install, build, and app serving.
- `Dockerfile.modern-api` builds the modern API runtime and drops to the
  unprivileged image user `node` before its verifier/server command.
- `Dockerfile.postgres-test` and `Dockerfile.modern-db-test` support seeded DB validation.
- `Dockerfile.proxy-test` validates same-origin proxy behavior.
- `Dockerfile.start-local-browser-test` validates rendered map behavior against the seeded integrated path.
- `docker-compose.integrated.yml` defines the app/API deployment topology.
- `docker-compose.public-api.yml` defines the optional host-exposed API overlay
  for intentional public API smoke paths.
- `.node-version`, `.nvmrc`, and `scripts/verify_node_runtime.js` define the
  authoritative local and CI Node runtime pin.

Generated `node_modules` directories and compiled CommonJS output under `dtoapi/modern/lib/` are not source baselines. Committed browser assets under `app/public/js/` are controlled because they are directly served by the static app.

## 11. Database Migration Control

Production database changes are explicit release artifacts and must not run from app startup, API startup, `/healthz`, `/readyz`, or container entrypoints.

Migration control rules:

- Store artifacts under `db/migrations/`.
- Use `db/migrations/TEMPLATE.md`.
- Prefer expand-and-contract migrations.
- Apply additive changes before application code requires them.
- Keep destructive or incompatible changes in a later release after old code paths are retired.
- Update API readiness contracts only when the modern API requires a new read table or column.
- Record backup, apply, verify, rollback, and post-deploy checks for each migration.

The current production read baseline is `baseline-read-v1`, verified by API `/readyz`.

## 12. Status Accounting

Configuration status accounting records what changed, why, where it is controlled, and whether it is releasable.

Required accounting records:

- Git commit SHA and branch.
- Changed configuration items.
- Validation commands run and skipped.
- Lockfile or dependency changes.
- Docker or CI changes.
- Migration artifact identifier and database baseline impact.
- Release artifact/image identifiers.
- Production environment variable set names or platform references, excluding secret values.
- Smoke check results for deployed release candidates.

Status should be visible in PR descriptions, release notes, deployment records, and relevant documentation updates.

## 13. Configuration Audits

### 13.1 Functional Configuration Audit

A Functional Configuration Audit confirms that controlled items satisfy documented behavior.

Audit checks:

- API routes match preserved compatibility contracts.
- Static app serves the documented first page and proxy behavior.
- `/healthz` and `/readyz` match deployment expectations.
- Docker seeded DB, proxy, and browser tests validate the integrated topology.
- Data source registry entries enforce Puerto Rico-only scope or deterministic Puerto Rico filters.

### 13.2 Physical Configuration Audit

A Physical Configuration Audit confirms the repository contents match the declared baseline.

Audit checks:

- Lockfiles exist for each package boundary and match manifests.
- Generated dependency folders are not tracked.
- Dockerfiles, Compose files, and CI files are present and referenced by docs.
- Migration artifacts use the required template.
- Production secrets, `.env` files, and exported platform configuration are absent from source control.
- Standards documents remain in `docs/standards/` and are updated when project controls change.

### 13.3 Release Configuration Audit

A Release Configuration Audit confirms a deployable candidate is traceable and reversible.

Audit checks:

- App and API artifacts are built from the intended commit.
- Database baseline and migration state are known.
- Production configuration verification passes.
- Release smoke checks pass.
- Rollback artifact pair and database rollback path are known.
- Fixture mode is not enabled in production.

## 14. Supplier, Tool, And Dependency Control

Third-party dependencies are accepted through package manifests and lockfiles. Browser vendor assets are isolated under `app/public/vendor/`. New runtime dependencies should be added only when they reduce project risk or complexity and must include a clear package boundary.

Data suppliers are accepted through the Puerto Rico source registry before import work begins. The original hackathon dataset remains unresolved until source, license, and transform evidence are recovered or replaced.

## 15. Records And Retention

Retain these records in Git or the deployment/release system:

- Source commits and reviewed PRs.
- Migration artifacts and release-specific execution notes.
- Release smoke summaries.
- CI and Docker validation logs where available.
- Data provenance and source registry updates.
- Standards document revisions.

Do not retain secrets, local credentials, private environment dumps, or generated dependency trees in Git.

## 16. Plan Maintenance

Update this SCM plan when:

- Branch, release, or Modernization fork practice changes.
- New controlled environments are added.
- Migration policy or readiness baselines change.
- Docker, CI, or lockfile boundaries change.
- New standards documents add controls that affect configuration management.

This plan should be reviewed alongside the other IEEE standards documents during recurring project audits.

## Audit Hooks

- On every standards-document pass, confirm this file still matches `README.md`, `docs/modernization-roadmap.md`, `docs/deployment-topology.md`, `docs/database-migrations.md`, and `docs/production-deployment.md`.
- On every dependency change, verify package manifests and lockfiles changed together and run the relevant npm audit commands.
- On every Docker or deployment change, verify the documented app/API topology, health checks, readiness checks, and fixture policy remain accurate.
- On every database change, confirm a migration artifact exists, `baseline-read-v1` impact is documented, and rollback instructions are realistic.
- On every release candidate, record commit SHA, app/API artifact identity, database baseline, validation commands, smoke results, and rollback path.
- On every public push or PR, inspect branch name, commit metadata, commit subjects, and PR text for personal identifiers, credentials, and AI/tool/vendor labels.
