# IEEE 1058 Software Project Management Audit Corpus

Status: active audit guide  
Scope: utoplan.Me Modernization fork  
Standard focus: IEEE 1058 Software Project Management Plan  
Owning corpus file: `docs/standards/audits/ieee-1058-project-audit.md`

## Purpose

This corpus guides recurring audits of the project's Software Project
Management Plan practice. It is not the full SPMP. It defines the evidence,
management controls, risk and resource checks, recommendation rules, and update
triggers that keep the IEEE 1058 plan current while the modernization fork
evolves.

The current project baseline is a modernization effort for a map-first Puerto
Rico business planning tool. Project management must coordinate product scope,
legacy behavior preservation, modern TypeScript API replacement, static app and
same-origin proxy behavior, PostgreSQL-backed deployment, data provenance,
release readiness, rollback control, and standards documentation across a
single ongoing Modernization fork.

## IEEE 1058 Audit Objective

Use this corpus to confirm that project management evidence remains:

- Current: the roadmap, plans, controls, and release assumptions match the
  implementation state.
- Actionable: each management item identifies concrete next work, decision
  criteria, verification, or owner area.
- Traceable: scope, schedule, resources, risks, and recommendations link to
  repository artifacts and validation evidence.
- Controlled: project changes are bundled, reviewed, validated, and committed
  without weakening quality, configuration, test, requirements, design, or V&V
  controls.
- Sustainable: recurring updates preserve the standards corpus for the life of
  the project rather than treating documentation as a one-time deliverable.

## Evidence Map

Inspect these artifacts during each IEEE 1058 audit:

- `README.md`: product vision, modernization purpose, project layout, root
  commands, Docker validation, local app/API flow, and environment contracts.
- `docs/modernization-roadmap.md`: current state, target outcomes, phase exit
  criteria, completed work, open work, and immediate next step.
- `docs/api-modernization.md`: API replacement plan, compatibility boundary,
  typed source ownership, test strategy, and remaining endpoint migration work.
- `docs/frontend-inventory.md`: frontend surface inventory, map-first behavior,
  fixture constraints, browser smoke coverage, and first-party asset ownership.
- `docs/product-scope.md`: descriptive planning-context scope boundary and next
  product-work guardrails.
- `docs/business-location-decision-framework.md`: active business-profile,
  decision-lens, geographic-reach, and scale-scenario milestone authority.
- `docs/production-readiness-decision-board.md`: latest recorded bundle
  classification, accepted invariants, and release-readiness decisions.
- `docs/data-intake.md`: data intake scope, registry controls, accepted
  candidates, and blocked source classes.
- `docs/data-provenance.md`: verified source evidence, unresolved gaps, and
  production-use blockers.
- `docs/database-migrations.md`: migration artifact strategy, release checklist,
  rollback expectations, and database review policy.
- `docs/deployment-topology.md`: app/API/database topology, private API
  exposure, proxy mode, health/readiness endpoints, and fixture exclusion.
- `docs/production-deployment.md`: production configuration, preflight checks,
  migration/seeding policy, deployment order, smoke checks, and rollback
  triggers.
- `docs/standards/*.md` and `docs/standards/audits/*.md`: cross-standard
  commitments, audit corpuses, and standards-specific recommendations.
- `db/migrations/`: database baseline and release change artifacts.
- `data/sources/puerto-rico.json`: source registry and data scope evidence.
- `data/mappings/puerto-rico-business-categories.json`,
  `data/municipalities/planning-context-municipalities.json`,
  `data/naics/planning-context-naics-titles.json`, and
  `data/planning-context/`: planning-context scope evidence, candidate
  category mapping inputs, controlled fact-label inputs, and descriptive
  fixture slices.
- Root and service `package.json` files, lockfiles, CI configuration,
  Dockerfiles, and Compose files: executable project control evidence.
- Test suites under `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and
  `test/`: verification evidence for project milestones and release gates.
- Git state, branch name, latest commit metadata, staged changes, and PR
  metadata when available: change control and public repository hygiene
  evidence.

## Recurring Project Controls

### Scope Control

- Product scope remains tied to source-backed Puerto Rico place-based business
  planning.
- Active modernization scope is explicit: preserve known legacy behavior,
  replace the retired API stack, maintain map-first browser behavior, separate
  fixtures from production data, and provide deployable PostgreSQL-backed
  services.
- New feature work does not bypass provenance, API contract, migration,
  deployment, or validation controls.
- Broad rewrites are sequenced only when behavior is pinned and the roadmap
  identifies the affected phase or decision.
- Out-of-scope work is deferred with rationale, expected trigger, and owner
  area rather than silently entering the implementation queue.

### Schedule And Milestone Control

- `docs/modernization-roadmap.md` reflects the actual current state and the next
  coherent implementation bundle.
- Phase exit criteria remain measurable through commands, tests, docs, or
  release artifacts.
- The profile/reach milestone remains planned until a versioned contract and
  executable three-scenario fixture matrix meet the documented exit criteria.
- Completed phase claims have supporting repository evidence.
- In-progress items distinguish blocked provenance work, active implementation
  work, hardening requirements, and optimization opportunities.
- Release candidates identify the commit, app/API pair, database baseline,
  validation stack, and rollback readiness.

### Work Breakdown And Ownership

- Project work is grouped into cohesive bundles with shared validation surface.
- Each bundle identifies affected domains: app, API, database, data source,
  deployment, tests, standards docs, or release operations.
- Parallel documentation or audit agents own only their assigned files and do
  not revert or rewrite other agents' edits.
- Cross-standard changes are coordinated through evidence links rather than
  duplicated conflicting controls.
- Public branch names, commit subjects, PR titles, and generated docs avoid
  personal identifiers and AI/tool/vendor labels.

### Communication And Reporting

- Completed project passes report changed files, validation performed, skipped
  checks, residual risks, and recommended next direction.
- Audit findings identify evidence, risk, recommendation, verification, status,
  and owner area.
- Stale documentation, failed checks, provenance blockers, and release risks are
  reported plainly before merge or release.
- Management decisions that accept residual risk are recorded near the artifact
  they affect.
- Standards documents and audit corpuses are updated in the same project bundle
  when their assumptions change.

### Validation And Release Governance

- Normal release readiness remains rooted in executable checks from the
  repository root.
- Docker validation is preferred for deployment, database, proxy, and browser
  integration compatibility when Docker is available.
- Host-native checks may be used for narrow edits when they are authoritative,
  materially faster, or Docker is unavailable.
- Skipped Docker or release checks are reported with a reason and residual risk.
- Production deployment is not recommended unless configuration verification,
  health/readiness checks, public smoke checks, migration evidence, and rollback
  triggers are current.

## Risk And Resource Checks

### Scope And Product Risk

- Has the change expanded the product beyond Puerto Rico business planning
  without an approved requirements and data-source update?
- Does the roadmap still make the next project action explicit?
- Could a user mistake planning support for legal, permitting, investment, or
  labor-market authority?
- Does any new UI, API, or data behavior weaken map-first orientation or
  source-backed decision support?

### Technical Risk

- Could the change regress same-origin `/v1/*` behavior, app/API proxying,
  CORS, gzip, route status codes, or response envelopes?
- Could the change expose raw database errors or serve fixture data in a
  production path?
- Does the API still fail fast when production database configuration is
  missing?
- Does `/readyz` still verify the database/schema contract required by the
  current deployed API?
- Are generated outputs, dependency folders, logs, and local environment files
  still excluded from source control?

### Data And Compliance Risk

- Did the change add, alter, or rely on a data source without registry,
  license, scope, retrieval date, and transform evidence?
- Are broad national datasets deterministically filtered to Puerto Rico before
  production-style use?
- Are demo fixtures, test seeds, recovered legacy data, and production data
  visibly separate?
- Are unresolved legacy data gaps still blocked from production import until
  source, license, and transform path are recorded?

### Resource And Capacity Risk

- Do planned bundles fit the available validation surface, including API tests,
  browser smoke tests, data-source validation, Docker checks, and release smoke?
- Does the project depend on unavailable local services, Docker, databases,
  browsers, secrets, or third-party portals for a required milestone?
- Are CI time, local validation time, and contributor attention used efficiently
  by grouping related work instead of fragmenting review surfaces?
- Are ongoing standards updates assigned to the relevant corpus owners when
  project controls change?
- Is any project dependency, runtime, or deployment target approaching an
  unsupported or unmaintained state?

### Operational Risk

- Are production environment variables documented and verifiable before
  startup?
- Does the deployment topology still keep the API private behind the app proxy?
- Are rollback triggers concrete, including readiness failure, fixture-mode
  exposure, `/v1/unis` failure, database query failure, and browser smoke
  failure?
- Are migration artifacts explicit release records rather than startup side
  effects?
- Can a new operator reproduce install, build, test, start, release
  verification, and rollback expectations from repository documents?

## Project Management Audit Checklist

Run this checklist after substantial implementation bundles, before release
candidates, and whenever standards documents are updated.

### Planning

- The SPMP or interim project corpus identifies project purpose, scope,
  deliverables, constraints, assumptions, and lifecycle approach.
- Current work maps to a roadmap phase, release objective, audit finding, or
  documented modernization need.
- Dependencies between app, API, database, data registry, deployment, tests, and
  standards docs are visible.
- Project success criteria use observable outcomes such as commands, endpoint
  behavior, rendered browser state, readiness status, or migration evidence.
- Deferred work has a reason, trigger, and owner area.

### Tracking

- The roadmap and standards corpuses reflect completed changes and remaining
  risks.
- Open recommendations are classified as required hardening, required
  verification, required documentation, optimization, or deferred with
  rationale.
- Validation results are recorded in final reports, PR notes, release notes, or
  audit findings as appropriate.
- Any skipped check has a stated reason and a clear follow-up condition.
- Project documentation does not claim completion beyond available evidence.

### Control

- Changes are made in reviewable bundles and avoid unrelated refactors.
- Mutating operations, destructive database changes, history rewrites, and
  public pushes require explicit intent and rollback consideration.
- Release work uses one coherent branch and PR per bundled validation surface
  unless cross-repo or emergency work requires a different shape.
- The Modernization fork remains the ongoing commit target for standards and
  modernization controls.
- Git metadata and public artifacts satisfy privacy and public repository
  hygiene expectations.

### Quality Integration

- IEEE 730, 828, 829, 830, 1012, 1016, and 1058 artifacts are updated when
  their management assumptions change.
- Project management recommendations do not conflict with SQA, SCM, test,
  requirements, design, or V&V controls.
- Validation commands remain synchronized across README, roadmap, deployment
  docs, standards plans, and audit corpuses.
- Data provenance blockers are treated as project risks, not only data-team
  backlog.
- Security and dependency audit posture is visible before production release.

## Hardening And Optimization Recommendation Rules

Classify project management recommendations by project risk and implementation
urgency:

- Required hardening: applies when project controls allow unsafe production
  data, unverified releases, fixture exposure, missing rollback, untracked
  migrations, secret exposure, or unreviewed public artifacts.
- Required verification: applies when a milestone, release claim, or behavior
  change lacks an executable test, smoke check, readiness check, migration
  verification, or operator inspection.
- Required documentation: applies when scope, schedule, risk, resource,
  ownership, validation, release, or rollback assumptions change without
  corresponding README, roadmap, deployment, or standards updates.
- Optimization: applies when a change improves cycle time, validation cost,
  maintainability, observability, or operator ergonomics without blocking the
  current release objective.
- Defer with rationale: applies when a recommendation is valid but outside the
  current phase, blocked by missing evidence, or better sequenced after a
  specific milestone.

Severity thresholds:

- Critical: release can deploy wrong data, expose secrets, mutate production
  schema without an artifact, lose rollback ability, or serve production traffic
  from fixtures.
- High: roadmap or release controls are materially stale, a required validation
  gate is missing, app/API/database compatibility is unverified, or data
  provenance is bypassed.
- Medium: ownership, schedule, documentation, or validation evidence is
  incomplete enough to slow review or mislead operators.
- Low: naming, formatting, traceability, or reporting issues that do not
  directly affect release safety or project continuity.

Every accepted recommendation should include:

- Evidence: file path, command result, observed behavior, or missing artifact.
- Risk: project impact if not corrected.
- Action: smallest coherent project bundle that resolves the issue.
- Verification: command, inspection, release check, or audit update that proves
  completion.
- Status: proposed, accepted, implemented, deferred, rejected, or superseded.

Do not recommend production deployment, production import, or destructive
database acceptance unless source provenance, validation evidence, resource
readiness, and rollback evidence are all present.

## Update Triggers

Update this corpus, the IEEE 1058 SPMP, or both when any of these occur:

- Project scope, product audience, modernization objective, or target deployment
  model changes.
- Roadmap phases, exit criteria, current state, or immediate next step change.
- Root scripts, validation stack, CI workflows, Docker workflows, release
  commands, or smoke checks change.
- A new service, runtime, package, database dependency, deployment target, or
  operational dependency is added.
- API contracts, frontend map behavior, proxy behavior, fixture policy, health
  checks, readiness checks, or rollback triggers change.
- A migration artifact, database baseline, schema readiness contract, or
  migration process changes.
- A data source is added, rejected, promoted, deprecated, or reclassified.
- A provenance gap is closed, discovered, or accepted as residual risk.
- Security posture changes, including dependency audit findings, secret-handling
  policy changes, or accepted vulnerabilities.
- Resource assumptions change, including Docker availability, CI capacity,
  browser test requirements, external portal availability, or secret access.
- Any IEEE 730, 828, 829, 830, 1012, 1016, or 1058 standards document changes
  project management obligations.
- A release, failed deployment, incident, audit finding, or user directive
  changes how the project is planned, tracked, validated, or committed.

## Audit Cadence

- Per change bundle: inspect scope, validation, documentation, and risk impact
  before merge or commit.
- Per release candidate: verify roadmap currency, release evidence, resource
  readiness, migration state, smoke checks, and rollback readiness.
- Weekly while active: review open project risks, standards update needs,
  provenance blockers, validation drift, and the immediate next step.
- Monthly while active: review accumulated recommendations, project resource
  assumptions, dependency posture, and whether the phase plan still matches the
  implementation reality.
- After incident or failed deployment: record a finding, classify severity,
  identify the failed control, update the relevant corpus, and define
  verification for the correction.

## Finding Record Template

Use this structure when adding a project management finding to the SPMP,
standards issue, PR, or release note:

```text
Finding:
Severity:
Project area:
Evidence:
Risk:
Recommendation:
Verification:
Status:
Owner area:
Target milestone:
Review date:
```

## Current Control Expectations

- The Modernization fork remains the ongoing target for standards updates and
  modernization work.
- Project work is bundled by shared validation surface and committed with clear,
  neutral public metadata.
- Root scripts remain the authoritative local validation entrypoint.
- Docker validation remains the preferred compatibility path for deployment,
  database, proxy, and browser integration behavior when available.
- Production release requires current configuration verification, health and
  readiness checks, public smoke checks, migration evidence, and rollback
  triggers.
- Source-backed Puerto Rico data remains the accepted production data scope
  until broader scope is explicitly approved and documented.
- Standards plans and audit corpuses are living project controls and must be
  updated whenever their assumptions change.
