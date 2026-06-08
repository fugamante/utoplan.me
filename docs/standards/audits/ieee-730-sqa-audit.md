# IEEE 730 Software Quality Assurance Audit Corpus

Audit ownership: IEEE 730 Software Quality Assurance Plan control agent.

Controlled artifact: this file only.

Project context: `utoplan.Me` is a modernization fork that preserves the
legacy map-first behavior while replacing the retired API stack with a modern
TypeScript Node API, a PostgreSQL-backed deployment path, explicit data
provenance controls, and repeatable Docker/CI validation.

## Audit Objective

Use this corpus to keep the Software Quality Assurance Plan evidence current as
the project evolves. The audit should confirm that quality responsibilities,
verification gates, release controls, data provenance, and operational checks
remain visible, repeatable, and enforced by repository artifacts.

This corpus does not replace the SQA plan. It defines the recurring evidence
review, questions, recommendation rules, and update triggers that keep the SQA
plan accurate.

## Evidence Map

Review these artifacts during each IEEE 730 audit:

- `README.md`: product vision, modernization purpose, project layout, root
  commands, Docker validation, local app/API flow, and runtime environment.
- `docs/modernization-roadmap.md`: active phases, exit criteria, current state,
  immediate next step, and security/dependency gate status.
- `docs/api-modernization.md`: modern API runtime boundary, compatibility
  rules, typed source ownership, and test locations.
- `docs/frontend-inventory.md`: served surface, first-party browser ownership,
  fixture policy, TypeScript boundary, and browser smoke coverage.
- `docs/product-scope.md`: current descriptive product boundary for planning
  context and non-recommendation constraints.
- `docs/database-migrations.md`: migration artifact format, release policy, and
  database review checklist.
- `docs/data-provenance.md`: verified source evidence, unresolved provenance
  gaps, and production-use blockers.
- `docs/data-intake.md`: Puerto Rico-only source registry contract and source
  validation command.
- `docs/deployment-topology.md`: app/API/database topology, health checks,
  readiness checks, proxy policy, and fixture exclusion policy.
- `docs/production-deployment.md`: production configuration, preflight checks,
  migration and seed policy, deployment order, rollback triggers, and release
  smoke checks.
- `db/migrations/`: database change artifacts and schema baseline evidence.
- `data/sources/puerto-rico.json`: approved candidate source registry.
- `data/mappings/puerto-rico-business-categories.json`: candidate category
  crosswalk used by descriptive planning-context fixtures.
- `data/naics/planning-context-naics-titles.json`: controlled NAICS title
  labels for exposed planning-context fact rows when the source CSV omits
  `cnaic_name`.
- `data/planning-context/`: descriptive municipality/category fixture slices
  with visible confidence and limitation metadata.
- `package.json`, `app/package.json`, `dtoapi/package.json`, and
  `dtoapi/modern/package.json`: authoritative scripts, dependencies, and audit
  surfaces.
- CI configuration and Docker files, including `azure-pipelines.yml` and
  `docker-compose.public-api.yml`: validation parity with documented release
  and compatibility checks.
- Test suites under `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and
  `test/`: executable evidence for API contracts, browser behavior, source
  registry controls, and deployment checks.

## Recurring Audit Checklist

### SQA Governance

- Does the repository still identify the quality-critical product goal:
  source-backed Puerto Rico business planning through map-first evidence?
- Are current quality objectives traceable to modernization risks such as API
  compatibility, data provenance, database readiness, fixture isolation, and
  deployment rollback?
- Are quality gates documented in one or more executable root commands rather
  than only described in prose?
- Are quality responsibilities clear for API contracts, frontend smoke
  behavior, database migrations, data intake, deployment, and security audits?
- Do new or changed docs avoid weakening the current production safety
  posture?

### Process And Standards

- Are root commands in `README.md` still valid and aligned with package scripts?
- Does the modernization roadmap record current status and next action without
  stale phase claims?
- Do code changes preserve the documented boundary between dependency-free app
  serving, modern TypeScript API source, generated browser assets, fixtures, and
  production data?
- Are generated dependency folders, compiled API output, logs, and temporary
  artifacts excluded from source control?
- Are public-facing branch names, commit messages, PR titles, and documentation
  free of personal identifiers and tool/vendor labels?

### Requirements And Contract Quality

- Are externally observable API behaviors pinned by tests before replacement or
  refactor work changes them?
- Are route, status, error, CORS, gzip, and missing-record behaviors covered
  where they are part of the compatibility contract?
- Does new API behavior enter through typed sources under
  `dtoapi/modern/src/` with focused tests under `dtoapi/modern/test/` or the
  documented compatibility test area?
- Does frontend behavior remain tied to explicit `data-ui` and `data-map`
  hooks, with browser smoke coverage for user-visible map behavior?
- Are fixture and demo paths explicit, documented, and excluded from production
  runtime?

### Verification And Validation

- Has the project run the appropriate validation stack for the changed surface?
- For normal release readiness, is the documented validation stack still:
  `npm run install:all`, `npm run build`, `npm run verify:deployment`,
  `npm run verify:release`, `npm run verify:release-smoke`,
  `npm run test:browser`, `npm run docker:test:db`,
  `npm run docker:test:proxy`, `npm run docker:test:start-local-browser`, and
  npm audits for root, `app`, `dtoapi`, and `dtoapi/modern`?
- If Docker validation was skipped, is the reason explicit and acceptable for
  the risk of the change?
- Are health and readiness checks aligned with the service responsibility:
  app `/healthz`, API `/healthz`, and API `/readyz` for database/schema
  readiness?
- Do release smoke checks verify public app access and same-origin `/v1/unis`
  behavior through the app?

### Configuration Management Alignment

- Are SQA expectations aligned with SCM controls for migrations, source
  registry changes, generated assets, and release artifacts?
- Are migration artifacts immutable release records under `db/migrations/`
  rather than startup side effects?
- Are schema changes reviewed independently from application code and paired
  with rollback and read-only verification SQL?
- Is the `baseline-read-v1` readiness contract updated only when the modern API
  requires a new production read table or column?
- Are deployment artifacts built from the intended commit, and are app/API
  release pairs tracked together?

### Data Quality And Provenance

- Is every production-style import candidate registered in
  `data/sources/puerto-rico.json` before import work starts?
- Does each source entry include publisher, portal, license, source URL,
  resource or API URL, target endpoint/table, status, source-basis note, and
  registry retrieval date?
- Are broad national datasets blocked unless a deterministic Puerto Rico filter
  is documented and enforced by import code?
- Are unresolved legacy tables, currently `cdepts`, `businesses`, and
  `grade_cs`, still blocked from production-style import until source, license,
  and transform path are recorded?
- Are demo fixtures, test seed data, recovered legacy data, and production data
  kept visibly separate?
- Do candidate business-category mappings and planning-context fixtures remain
  descriptive and free of score, ranking, or recommendation drift?

### Security And Operational Quality

- Do dependency audits still report zero known vulnerabilities, or are findings
  triaged with owner, severity, fix path, and acceptance rationale?
- Are production credentials and environment dumps absent from source control?
- Does the API fail fast in production when database configuration is missing?
- Is the API private to the service network in the documented production
  topology?
- Is the database user limited to permissions required by the current read
  endpoint set?
- Are rollback triggers concrete and testable, including readiness failures,
  fixture mode in app health, `/v1/unis` failures, database query failures, and
  browser smoke failures?

## Recurring Audit Questions

Ask these questions after every substantial implementation bundle and before
every release candidate:

- What user-visible or operator-visible behavior changed?
- Which documented quality objective does the change support?
- What existing contract could regress because of this change?
- Which test or check proves that the contract still holds?
- Did the change alter data source scope, provenance, license, or transform
  assumptions?
- Did the change introduce a production configuration, secret, migration, or
  rollback obligation?
- Did any validation command fail, get skipped, or become stale?
- Are the docs and scripts consistent enough that a new maintainer can reproduce
  the expected checks from the repository root?
- Is any recommendation a hardening requirement before production use, or an
  optimization that can be sequenced later?
- Has the audit corpus itself changed when new evidence, checks, or release
  controls were added?

## Recommendation Rules

Classify recommendations by production risk and verification value:

- Required hardening: applies when a defect can expose incorrect production
  data, disable readiness/rollback, bypass provenance controls, leak secrets,
  weaken API compatibility, or make release validation non-repeatable.
- Required verification: applies when a behavior change lacks an executable
  test, smoke check, migration verification, or documented operator check.
- Required documentation: applies when a code or process change creates a new
  quality obligation not reflected in README, roadmap, deployment, migration,
  provenance, or audit artifacts.
- Optimization: applies when the change improves speed, maintainability,
  observability, or operator ergonomics without blocking current quality
  objectives.
- Defer with rationale: applies when a recommendation is valid but outside the
  current risk surface; record the reason, expected trigger, and owner area.

Do not recommend production import, production deployment, or destructive
database change acceptance unless source provenance, validation evidence, and
rollback evidence are all present.

## Update Triggers

Update this audit corpus when any of these occur:

- A new IEEE standards document is added or an existing standards document
  changes its quality gate assumptions.
- Root commands, package scripts, CI jobs, Docker files, or release verification
  commands change.
- API routes, response envelopes, status codes, readiness checks, or database
  schema contracts change.
- Frontend served surface, map data flow, fixture behavior, or browser smoke
  coverage changes.
- A new migration artifact, migration policy, or production database baseline is
  introduced.
- A data source is added, rejected, promoted, deprecated, or reclassified.
- A provenance gap is closed or a new gap is discovered.
- Dependency audit posture changes, especially if a vulnerability is accepted
  temporarily.
- Deployment topology, production secret policy, rollback flow, or health check
  policy changes.
- A release incident, failed smoke check, or escaped regression reveals a
  missing SQA control.

## Audit Output Format

Each completed IEEE 730 audit should produce or update a short record with:

- date and commit or branch reviewed
- changed surfaces inspected
- evidence reviewed
- checks run and results
- skipped checks with reason
- findings by recommendation class
- accepted risk or deferral rationale
- follow-up owner area
- whether this audit corpus or the SQA plan needs an update

Keep audit records concise enough to remain useful during ongoing modernization
work, but specific enough that the next auditor can reproduce the conclusion.
