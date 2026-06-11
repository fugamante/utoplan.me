# IEEE 830 Software Requirements Specification Audit Corpus

Status: active audit guide  
Scope: utoplan.Me Modernization fork  
Standard focus: IEEE 830 Software Requirements Specification  
Owning corpus file: `docs/standards/audits/ieee-830-srs-audit.md`

## Purpose

This corpus guides recurring audits of the project's Software Requirements
Specification practice. It is not the full SRS. It defines the evidence,
requirement checks, traceability checks, recommendation rules, and update
triggers that keep requirements complete, testable, current, and aligned with
the modernization fork.

The current product requirement baseline is a map-first planning tool for
business formation in Puerto Rico. The active modernization requirements center
on preserving known legacy behavior, serving same-origin `/v1/*` data through a
modern TypeScript API, separating fixture/test/production data, enforcing
Puerto Rico-only data provenance, and providing deployment health, readiness,
and rollback evidence.

## IEEE 830 Audit Objective

Use this corpus to confirm that requirements remain:

- Correct: they match the product vision and current implementation direction.
- Unambiguous: each requirement has one observable meaning.
- Complete enough: user, data, API, deployment, quality, and constraint needs
  are represented.
- Consistent: requirements do not conflict with provenance, topology, SCM, SQA,
  or test controls.
- Ranked: production blockers, hardening needs, and optimizations are
  distinguishable.
- Verifiable: each requirement has an inspection, test, smoke check, or
  operator procedure.
- Modifiable: updates can be made without losing identifiers or trace links.
- Traceable: requirements link backward to evidence and forward to design,
  code, tests, deployment, and audit findings.

## Evidence Map

Inspect these artifacts during each IEEE 830 audit:

- `README.md`: product vision, user audience, modernization purpose, project
  layout, root commands, Docker validation, local app/API flow, and runtime
  environment.
- `docs/modernization-roadmap.md`: active phase requirements, exit criteria,
  completed constraints, immediate next step, and security gate status.
- `docs/api-modernization.md`: preserved API compatibility requirements,
  runtime boundary, typed source ownership, and next API slice rules.
- `docs/frontend-inventory.md`: frontend served surface, map-first behavior,
  data URL policy, fixture constraints, and browser smoke expectations.
- `docs/product-scope.md`: descriptive product boundary for planning-context
  behavior and non-recommendation constraints.
- `docs/data-intake.md`: Puerto Rico-only source acceptance requirements,
  registry fields, current candidates, and blocked legacy tables.
- `docs/data-provenance.md`: verified legacy evidence, unresolved source gaps,
  and requirements that must remain blocked before production use.
- `docs/database-migrations.md`: database baseline, migration artifact
  requirements, release checklist, and rollback expectations.
- `docs/deployment-topology.md`: app/API/database request flow, private API
  requirement, same-origin proxy behavior, health/readiness endpoints, and
  fixture exclusion.
- `docs/production-deployment.md`: production configuration requirements,
  secret policy, preflight checks, migration/seeding policy, release smoke
  checks, and rollback triggers.
- `docs/standards/*.md` and `docs/standards/audits/*.md`: cross-standard
  controls that add or constrain requirements.
- `data/sources/puerto-rico.json`: accepted data-source requirement evidence.
- `data/mappings/puerto-rico-business-categories.json`: category-to-NAICS
  requirement evidence for descriptive planning-context selection.
- `data/municipalities/planning-context-municipalities.json`: municipality
  naming requirement evidence for descriptive planning-context summaries and
  details.
- `data/planning-context/`: descriptive planning-context fixture evidence for
  municipality/category summary and detail behavior.
- `db/migrations/`: database requirement and readiness baseline evidence.
- `.node-version`, `.nvmrc`, and `scripts/verify_node_runtime.js`: reviewed
  runtime requirement evidence for local, CI, and Docker validation parity.
- `package.json`, service package manifests, CI configuration, Dockerfiles, and
  Compose files: executable requirement and environment evidence.
- Tests under `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and `test/`:
  verification evidence for user-visible behavior, API contracts, browser
  behavior, data-source controls, and deployment checks.

## Requirements Inventory Checklist

Use this checklist to verify that the SRS or interim requirements corpus covers
the current project surface.

### Product And User Requirements

- The SRS identifies the primary users: founders, investors, planners, and
  local development teams evaluating Puerto Rico business opportunities.
- The SRS preserves the product goal: place-based analysis that helps users
  reason about viability, constraints, and resources before and after business
  launch.
- Map-first exploration is stated as a core user requirement, not only an
  implementation detail.
- Requirements distinguish planning assistance from authoritative legal,
  permitting, investment, or labor-market advice.
- User-facing behavior is defined in observable terms, including map rendering,
  sidebar/layer controls, and data-loading outcomes.

### Functional Requirements

- Same-origin `/v1/*` browser requests remain a requirement for app/API
  compatibility.
- The app can run against the modern API through `UTOPLAN_API_ORIGIN`.
- Offline fixture mode requires explicit `UTOPLAN_DEMO_FIXTURE=1` and is
  limited to demos and tests.
- The modern API preserves known root and seeded read endpoint contracts before
  new endpoint work is accepted.
- The modern API and browser preserve descriptive-only planning-context summary
  and detail behavior before any score, ranking, or recommendation feature is
  accepted.
- Known record routes define status, envelope, CORS, gzip, missing-record, and
  unsupported-method behavior where those behaviors are part of the public
  contract.
- Database-backed readiness is represented through `/readyz`; shallow process
  health remains `/healthz`.
- Source registry validation blocks unsupported production-style data intake.
- Legacy tables without source, license, and transform evidence remain blocked
  from production import.

### Data Requirements

- Puerto Rico is the active data scope unless a broader scope is explicitly
  approved and documented.
- Each accepted production-style source requires publisher, portal, license,
  source URL, resource/API URL, target endpoint/table, status, source-basis
  note, and registry retrieval date.
- `cbps` and `unis` source entries require full preserved-column
  `legacySchemaMap` coverage evidence with notes for every non-exact mapping.
- `cbps` and `unis` candidates that remain unsafe to import require explicit
  `importReadiness` blocker records instead of hiding unresolved risks in prose.
- Geocoded `unis` controls must quarantine unmatched non-exact institution
  rows rather than promoting them through alias logic.
- Broad national datasets require deterministic Puerto Rico filtering in both
  the registry and import logic.
- Demo fixtures, test seed data, recovered legacy data, and production data are
  separate requirement classes.
- Candidate business-category mappings and planning-context fixtures remain
  descriptive and traceable, not implicit scoring logic.
- Active planning-context municipality labels remain source-backed and do not
  regress to placeholder naming in API or browser-visible responses.
- Requirements identify provenance gaps as blockers, not as implementation
  backlog only.

### Interface And Deployment Requirements

- The browser uses the app origin for static assets and `/v1/*` data.
- The API remains private behind the app proxy in the integrated topology.
- PostgreSQL is the authoritative database for production-style read data.
- Production API startup fails fast when required database configuration is
  missing.
- Release requirements include app `/healthz`, API `/healthz`, API `/readyz`,
  public `/v1/unis`, and rollback trigger checks.
- Required environment variables are documented and verifiable before service
  startup.

### Nonfunctional Requirements

- Requirements include reproducible install, build, test, and start workflows
  from the repository root.
- Requirements keep the reviewed Node 22 runtime explicit across version pins,
  package metadata, CI, and `npm run test:node-runtime`.
- Requirements include dependency and generated-output hygiene.
- Requirements include security expectations for dependency audits, secret
  handling, private API exposure, and raw error suppression.
- Requirements include rollback readiness for deployment and database changes.
- Requirements include maintainability constraints: typed modern API sources,
  small compatibility layers, and no broad rewrites that mix behavior, typing,
  and framework replacement without traceability.
- Performance or WebAssembly requirements are not accepted without measured
  hotspots, target thresholds, and fallback behavior.

## Recurring Requirement Quality Checks

Run these checks whenever the SRS, roadmap, deployment docs, data docs, or
observable behavior changes.

- Every requirement has a stable identifier or a stable section anchor.
- Each requirement states one actor, system response, constraint, or quality
  attribute.
- Requirements use measurable acceptance language such as command result,
  endpoint response, rendered browser state, schema baseline, or registry field.
- Requirements avoid vague verbs such as improve, support, optimize, or harden
  unless paired with an acceptance condition.
- Requirements distinguish mandatory production gates from optional
  optimizations.
- Requirements that depend on external data name the source, scope, license,
  retrieval expectation, transform boundary, and mapped target-column coverage
  when available.
- Requirements that alter public behavior name the API route, UI path, status
  code, response body, or browser-visible outcome.
- Requirements that affect operations name the environment variable, health
  check, readiness check, artifact, rollback step, or release command.
- Requirements do not accept demo fixtures or test seeds as evidence for
  production data correctness.
- Requirements remain consistent with current SQA, SCM, test, design,
  verification, and project management audit corpuses.

## Traceability Checks

Maintain bidirectional traceability for each material requirement.

### Backward Trace

- Link each requirement to product vision, roadmap phase, deployment constraint,
  data provenance need, incident, user request, or standards finding.
- For legacy compatibility requirements, identify the captured legacy behavior
  or preserved contract test that justifies the requirement.
- For data requirements, link to `docs/data-intake.md`,
  `docs/data-provenance.md`, and the source registry entry.
- For operational requirements, link to deployment topology, production
  deployment runbook, Docker/Compose artifacts, and verification scripts.

### Forward Trace

- Link each requirement to implementation files or modules that satisfy it.
- Link each requirement to one or more tests, smoke checks, verification
  scripts, or manual operator checks.
- Link database requirements to migration artifacts and readiness contract
  checks.
- Link frontend requirements to browser smoke coverage or app contract tests.
- Link API requirements to compatibility and typed contract tests.
- Link unresolved requirements to a recommendation, issue, roadmap item, or
  explicit blocked status.

### Trace Matrix Minimum

Until a formal IEEE 830 SRS trace matrix exists, use this minimum row shape in
the SRS, roadmap, or standards issue:

```text
Requirement ID:
Requirement:
Source evidence:
Priority:
Implementation:
Verification:
Data/provenance impact:
Operational impact:
Status:
Last reviewed:
```

## Hardening And Optimization Recommendation Rules

Create a required hardening recommendation when a requirement gap could allow:

- production use of unproven, unlicensed, broad-scope, fixture, or seed data
- silent API contract drift for `/v1/*`, `/healthz`, or `/readyz`
- deployment without fail-fast configuration, readiness, or rollback evidence
- browser behavior that can regress without test or smoke coverage
- database schema use without migration, readiness, or rollback traceability
- public exposure of private API surfaces, secrets, or raw implementation
  errors
- requirements that contradict current test, SQA, SCM, or deployment controls

Create a required verification recommendation when a requirement is accepted
but lacks executable or inspectable proof.

Create a required documentation recommendation when implemented behavior,
operator practice, data policy, or release control is not reflected in the SRS
or linked requirements evidence.

Create an optimization recommendation only when the change improves clarity,
feedback speed, traceability, maintainability, or operator ergonomics without
weakening production gates.

Each recommendation must include:

- affected requirement or missing requirement
- evidence path or observed gap
- production or verification risk
- proposed requirement change
- implementation or documentation target
- verification command or inspection step
- status and next review trigger

Do not recommend broad rewrites, new frameworks, expanded data scope, or
production import as optimization unless the requirement evidence, provenance
evidence, implementation path, and verification path are all explicit.

## Update Triggers

Update this corpus, the formal IEEE 830 SRS, or both when any of these occur:

- Product vision, target user, user workflow, or planning decision scope
  changes.
- A new endpoint, response field, status code, health check, readiness check,
  proxy behavior, or browser data path is added or changed.
- Frontend map, sidebar, layer, fixture, asset, or browser interaction behavior
  changes.
- A new data source, source registry schema, import script, provenance decision,
  blocked table resolution, or production data classification is introduced.
- A database table, column, migration artifact, readiness baseline, seed set, or
  rollback expectation changes.
- Deployment topology, Dockerfile, Compose file, CI workflow, release command,
  environment variable, secret policy, or rollback trigger changes.
- A test, smoke check, audit gate, or release verification command is added,
  removed, renamed, skipped, or made blocking.
- A standards document for IEEE 730, 828, 829, 1012, 1016, or 1058 changes a
  requirement source, quality gate, traceability expectation, or recommendation
  state.
- A production incident, failed deployment, failed audit, dependency finding, or
  accepted residual risk changes what the system must do.

## Audit Cadence

- Per change bundle: inspect changed behavior for new, changed, or invalidated
  requirements.
- Per release candidate: confirm blocking requirements have verification
  evidence and trace links.
- Monthly while active: review stale requirements, open recommendations,
  provenance blockers, and roadmap drift.
- After incident or rollback: add or revise requirements so the failure mode is
  observable, testable, and linked to a prevention or detection control.

## Finding Record Template

Use this structure when recording an IEEE 830 SRS audit finding:

```text
Finding:
Severity:
Requirement ID or gap:
Evidence:
Risk:
Recommendation:
Verification:
Status:
Owner:
Review date:
```

## Active Recommendations

### RECO-830-2026-06-08-01

- Class: required hardening
- Finding: the preferred municipality-level `cbps` replacement candidate is
  still blocked on the preserved `cnaic_name` requirement, but the standards
  corpus tracked that gap only as roadmap prose and registry blockers instead
  of an explicit requirements recommendation.
- Acceptance evidence:
  - `docs/data-source-schema-mapping.md` records the approved source-backed
    `cnaic_name` title source and deterministic join rule for the preferred
    municipality-level `cbps` candidate.
  - `data/sources/puerto-rico.json` updates the affected `cbps`
    `importReadiness` blocker state to match the approved title-source
    decision.
  - `data/naics/cbp-naics-titles.json` records a checked-in Census title
    artifact for the full registered Puerto Rico CBP code set, with
    `scripts/sync_naics_registry.js` as the documented rebuild path.
  - `docs/standards/ieee-830-srs.md` and any affected release/data docs reflect
    the resolved requirement state.
  - `npm run test:data-sources` and `npm run test:naics-registry` pass after
    the requirement and registry updates.
- Revisit trigger:
  - Before any production-style `cbps` import work, or before a release claims
    source-backed municipality business-pattern refresh behavior beyond the
    current descriptive planning-context fixtures.
- Status: complete (2026-06-10); the approved `cbps.cnaic_name` auxiliary
  join strategy now lives in the source registry and mapping docs, the checked-in
  Census title artifact closes the reproducible title-reference gap, and the
  preferred municipality-level `cbps` candidate is import-ready.

## Current SRS Control Expectations

- Requirements remain anchored in Puerto Rico business-planning support and
  source-backed map evidence.
- Preserved legacy behavior is accepted only when covered by captured contracts
  or explicit documentation.
- Same-origin `/v1/*` behavior, private API topology, and explicit fixture mode
  remain requirements until a deliberate replacement is approved.
- Production data requirements remain blocked where source, license, scope, or
  transform evidence is missing.
- Every production-facing requirement has a forward trace to tests, smoke
  checks, deployment verification, migration evidence, or operator inspection.
