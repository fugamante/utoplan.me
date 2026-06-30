# Software Engineering Standards Corpus

This directory is the active standards corpus for the `utoplan.Me`
modernization fork. It translates the IEEE document families requested for this
project into practical, repository-grounded controls.

The corpus is not archival. It must be updated whenever implementation,
validation, deployment, data provenance, risk, or project-management behavior
changes in a way that affects the documented controls.

## Standards Documents

| Standard | Project document | Audit corpus |
| --- | --- | --- |
| IEEE 730 Software Quality Assurance Plan | `ieee-730-sqa-plan.md` | `audits/ieee-730-sqa-audit.md` |
| IEEE 828 Software Configuration Management Plan | `ieee-828-scm-plan.md` | `audits/ieee-828-scm-audit.md` |
| IEEE 829 Software Test Document | `ieee-829-test-document.md` | `audits/ieee-829-test-audit.md` |
| IEEE 830 Software Requirements Specification | `ieee-830-srs.md` | `audits/ieee-830-srs-audit.md` |
| IEEE 1016 Software Design Description | `ieee-1016-design-description.md` | `audits/ieee-1016-design-audit.md` |
| IEEE 1012 Software Verification and Validation Plan | `ieee-1012-vv-plan.md` | `audits/ieee-1012-vv-audit.md` |
| IEEE 1058 Software Project Management Plan | `ieee-1058-project-management-plan.md` | `audits/ieee-1058-project-audit.md` |

Each standard has two maintained artifacts:

- The plan/specification document, which defines the active project control.
- The audit corpus, which defines evidence sources, recurring questions,
  recommendation rules, and update triggers for keeping the control current.

## Operating Rule

Any change that affects a documented control must update the relevant standard
document and audit corpus in the same bundle as the implementation change.
Examples include:

- New or changed root scripts, CI jobs, Docker paths, deployment steps, release
  gates, or rollback controls.
- New API endpoints, response envelopes, health/readiness behavior, database
  schema changes, migrations, or data-source registry changes.
- New frontend behavior, fixture handling, browser smoke coverage, public
  routes, or same-origin proxy assumptions.
- New product requirements, user classes, acceptance criteria, design
  decisions, risks, or quality metrics.
- Any hardening or optimization recommendation accepted for implementation.

## Recommendation Control

Recommendations produced by audits are treated as controlled project inputs:

1. Record the recommendation in the relevant audit corpus or linked project
   issue/roadmap entry.
2. Classify it as hardening, optimization, reliability, data governance,
   release safety, developer ergonomics, or documentation control.
3. Define acceptance evidence before implementation starts.
4. Implement the change in a cohesive bundle.
5. Run the narrow validation needed for the change and the broader project
   validation when feasible.
6. Update affected standards documents before the bundle is committed.

Recommendations that are intentionally deferred must retain a visible reason,
owner area, and revisit trigger.

## Modernization Fork Policy

Standards updates are part of the ongoing Modernization fork history. Completed
standards maintenance work should be committed on a neutral modernization branch
or the active modernization branch with public-safe metadata, following the
repository hygiene policy used for this project.

Before committing standards work, inspect:

- Changed files and generated artifacts.
- Branch name and outgoing commit subject.
- Local Git author identity if the repository has not already been configured
  safely for this session.
- Whether any public-facing title, body, branch, or commit text exposes private
  personal identifiers or AI/tool/vendor labels.

## Audit Cadence

- Per change: update affected standards in the same bundle as the project
  change.
- Per release candidate: review all seven audit corpuses against current code,
  docs, tests, Docker, deployment, and data evidence.
- Weekly while active development continues: review roadmap drift, open
  recommendations, stale assumptions, and validation gaps.
- After incident, rollback, failed smoke, data provenance change, or security
  finding: update affected standard documents before considering the response
  complete.

## Evidence Sources

Audits should use repository evidence first:

- `README.md`
- `docs/modernization-roadmap.md`
- `docs/api-modernization.md`
- `docs/frontend-inventory.md`
- `docs/product-scope.md`
- `docs/data-intake.md`
- `docs/unis-geocoding-policy.md`
- `docs/data-provenance.md`
- `docs/data-source-schema-mapping.md`
- `docs/database-migrations.md`
- `docs/deployment-topology.md`
- `docs/production-deployment.md`
- `.node-version`
- `.nvmrc`
- `db/migrations/`
- `data/sources/puerto-rico.json`
- `data/mappings/puerto-rico-business-categories.json`
- `data/naics/cbp-naics-titles.json`
- `data/geocoding/unis-census-geocoder-cache.json`
- `data/geocoding/unis-import-quarantine.json`
- `data/municipalities/planning-context-municipalities.json`
- `data/naics/planning-context-naics-titles.json`
- `data/planning-context/`
- Root/service `package.json` files and lockfiles
- Runtime, integration, and release verifier scripts such as
  `scripts/verify_node_runtime.js`, `scripts/start_integrated.js`,
  `scripts/verify_deployment_config.js`, `scripts/release_preflight.js`, and
  `scripts/release_smoke_check.js`
- Dockerfiles, Compose files, and CI configuration such as
  `docker-compose.public-api.yml` and `azure-pipelines.yml`
- Tests under `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and `test/`

External standards references may inform structure, but repository behavior is
the source of truth for project-specific claims.
