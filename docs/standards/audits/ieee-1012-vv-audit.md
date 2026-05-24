# IEEE 1012 Software Verification And Validation Audit Corpus

Status: active audit guide  
Scope: utoplan.Me Modernization fork  
Standard focus: IEEE 1012 Software Verification and Validation Plan  
Owning corpus file: `docs/standards/audits/ieee-1012-vv-audit.md`

## Purpose

This corpus is the standing audit and control guide for the project's IEEE 1012
Software Verification and Validation practice. It defines the evidence,
recurring checks, independence checks, recommendation rules, and update triggers
that keep verification and validation work current while the modernization fork
evolves.

This file is not the full V&V plan. It is the audit guide used to confirm that
the V&V plan remains evidence-backed, independent enough for the current risk,
and aligned with requirements, design, tests, configuration management,
deployment, data provenance, and project management controls.

The current V&V baseline is a map-first static frontend served by `app`, a
modern TypeScript Node API under `dtoapi/modern`, PostgreSQL as the
authoritative read store, explicit Puerto Rico-only source controls, and a
deployment topology where the browser reaches the app origin and the app proxies
same-origin `/v1/*` requests to a private API.

## IEEE 1012 Audit Objective

Use this guide to audit whether project verification and validation activities
are sufficient to answer two different questions:

- Verification: did the team build the product and controls correctly against
  the documented requirements, design, configuration, and test procedures?
- Validation: does the resulting system still serve the intended Puerto Rico
  business-planning use case with trustworthy provenance, safe operational
  behavior, and clear limits?

The audit should confirm that V&V evidence is:

- traceable from requirements to design, implementation, tests, release checks,
  and audit findings
- reproducible from repository files, root commands, Docker assets, and
  documented environment variables
- independent enough that a reviewer can challenge the change owner's claims
  without relying only on self-attestation
- risk-ranked so production blockers, hardening work, verification gaps,
  validation gaps, and optimizations are visibly different
- updated whenever project behavior, data scope, deployment topology, or
  standards expectations change

## V&V Evidence Map

Review these artifacts during each IEEE 1012 audit:

| Evidence | V&V role | Audit question |
| --- | --- | --- |
| `README.md` | product context, command inventory, local flow | Do documented commands and product claims still match the repository behavior? |
| `docs/standards/ieee-830-srs.md` | requirements baseline | Are requirements verifiable, ranked, and traceable to checks? |
| `docs/standards/ieee-1016-design-description.md` or interim design evidence | design baseline | Does design evidence explain the app/API/database/data boundaries under review? |
| `docs/standards/ieee-829-test-document.md` | test documentation baseline | Are V&V activities supported by test plans, cases, procedures, logs, incidents, and summaries? |
| `docs/standards/ieee-730-sqa-plan.md` | quality gate baseline | Are SQA gates reflected in V&V scope and risk treatment? |
| `docs/standards/ieee-828-scm-plan.md` | configuration baseline | Can every verified item be tied to a controlled commit, artifact, migration, or source record? |
| `docs/standards/audits/*.md` | cross-standard audit evidence | Do audit corpuses agree on gates, risks, and update triggers? |
| `docs/modernization-roadmap.md` | phase validation | Are active phase exit criteria independently checked and current? |
| `docs/api-modernization.md` | API verification evidence | Are compatibility contracts and typed API boundaries verified before changes are accepted? |
| `docs/frontend-inventory.md` | frontend verification evidence | Are served assets, map behavior, fixtures, and browser hooks represented in checks? |
| `docs/deployment-topology.md` | operational validation evidence | Does runtime topology match the validated request flow and API visibility assumptions? |
| `docs/production-deployment.md` | release validation evidence | Are preflight, smoke, rollback, secret, and readiness checks sufficient for promotion decisions? |
| `docs/database-migrations.md` and `db/migrations/` | database verification evidence | Do migration artifacts include preflight, apply, read-only verify, rollback, and readiness impact? |
| `docs/data-intake.md` and `data/sources/puerto-rico.json` | data validation evidence | Are production-style sources Puerto Rico-scoped, licensed, dated, and target-mapped? |
| `docs/data-provenance.md` | data trust validation | Are unresolved legacy source gaps visible and blocking where appropriate? |
| `package.json` and service manifests | executable V&V surface | Do scripts, audits, and dependencies match documented gates? |
| `app/test/`, `dtoapi/test/`, `dtoapi/modern/test/`, and `test/` | verification implementation | Do tests prove requirements and design contracts rather than only implementation details? |
| Dockerfiles, Compose files, CI definitions, and verification scripts | environment validation | Do container and CI paths exercise the intended release topology? |

The formal IEEE 1012 V&V plan baseline is
`docs/standards/ieee-1012-vv-plan.md`. If that artifact is temporarily
unavailable during an in-flight branch review, accept the SRS, SDD evidence,
test document, SQA plan, SCM plan, roadmap, and this corpus as interim V&V
evidence and record restoration of the formal baseline as an open action.

## Verification Checklist

Use this checklist to verify that implementation and configuration match the
documented baseline.

### Requirements Verification

- Every active IEEE 830 requirement has at least one test, smoke check,
  verification script, migration review, data-source review, or documented
  operator inspection.
- Requirements that affect public behavior identify the API route, browser
  behavior, status code, response shape, environment variable, or database
  baseline being verified.
- Requirements that affect data trust identify source, scope, license,
  retrieval date, transform boundary, and target endpoint or table.
- Requirements with unresolved evidence remain blocked, deferred, or explicitly
  risk-accepted; they are not treated as implemented.
- New behavior does not bypass requirements traceability by entering only
  roadmap prose, comments, or implementation notes.

### Design Verification

- The app remains the public static server and same-origin proxy boundary.
- Browser data flow remains app-origin first with `/v1/*` requests.
- Fixture mode remains explicit through `UTOPLAN_DEMO_FIXTURE=1` and excluded
  from production-like paths.
- The modern API remains TypeScript-first under `dtoapi/modern/src/` with
  generated output kept reproducible and ignored where expected.
- API response envelopes, error envelopes, route behavior, CORS, gzip,
  unsupported methods, and missing-record behavior are covered where they are
  part of the preserved contract.
- PostgreSQL readiness through `/readyz` verifies the schema required by the
  running API.
- Database schema mutation stays out of app/API startup and request handling.

### Test And Procedure Verification

- `README.md` root command inventory matches `package.json` scripts.
- `npm run install:all`, `npm run build`, and `npm run test` remain the normal
  root verification path.
- Narrow changes run targeted checks that match the changed surface.
- Release-impacting changes run Docker DB, proxy, and browser compatibility
  checks when Docker is available.
- Test procedures identify required setup, environment variables, fixture/seed
  boundaries, command sequence, and expected result.
- Skipped checks record a reason, risk, compensating evidence, and owner area.
- Failed checks create an incident, finding, or tracked follow-up before the
  change is promoted.

### Configuration Verification

- Verified artifacts are tied to a branch, commit, migration artifact, image,
  database baseline, source registry record, or release candidate.
- Lockfile changes match package manifest changes.
- Generated output, dependency trees, logs, local environment files, and
  credentials remain outside source control unless explicitly promoted as
  reviewed artifacts.
- Migration artifacts use the repository template and include rollback and
  read-only verification.
- Public branch names, commit subjects, PR titles, and documentation avoid
  personal identifiers and AI/tool/vendor labels.

## Validation Checklist

Use this checklist to validate that the system remains fit for the intended
product and operational purpose.

### Product Validation

- The first user experience remains map-first and oriented around Puerto Rico
  business formation analysis.
- The product presents data as planning evidence and tradeoff support, not as
  authoritative legal, permitting, investment, or labor-market advice.
- User-visible changes preserve or intentionally revise the documented product
  scope, target users, and acceptance criteria.
- Future recommendation, scoring, zoning, workforce, infrastructure, or
  lifecycle-planning features expose source, timestamp, transform, and known
  limitation metadata before being treated as decision-support outputs.

### Data Validation

- Production-style data remains Puerto Rico-only unless a broader scope is
  explicitly approved in requirements, data registry, provenance docs, and V&V
  evidence.
- Source entries include publisher, portal, license, source URL, resource or API
  URL, target endpoint or table, source-basis note, status, retrieval date, and
  active-table legacy mapping coverage where evidence exists.
- Broad national sources remain blocked unless deterministic Puerto Rico
  filtering is documented and enforced by import code.
- Demo fixture data, test seed data, recovered legacy data, replacement
  candidates, and production data remain visibly separate.
- Unresolved legacy data gaps remain visible and blocked from production-style
  import until source, license, and transform evidence exists.

### Operational Validation

- The validated runtime flow remains
  `Browser -> app -> /v1/* proxy -> api -> PostgreSQL`.
- The API remains private behind the app proxy in integrated production
  topology.
- Production API startup fails fast when required database configuration is
  missing.
- App `/healthz`, API `/healthz`, API `/readyz`, public `/v1/unis`, and browser
  smoke checks are sufficient to support release and rollback decisions.
- Rollback criteria include readiness failure, fixture leakage, public endpoint
  failure, database query failure, and browser smoke failure.
- Release evidence identifies the app/API artifact pair, commit, database
  baseline, smoke result, skipped checks, accepted risks, and rollback path.

## Independence Checks

IEEE 1012 expects V&V independence to scale with risk. Apply these checks to
avoid relying only on the implementer's own assertions.

### Role Independence

- The person or agent auditing V&V evidence should not be the only author of
  the implementation under review when the change affects production data,
  deployment, readiness, migration, or public contracts.
- For documentation-only updates, independence may be a cross-check against
  source files, tests, and peer standards documents.
- For code, database, data-source, deployment, or release changes, require a
  second reviewer, peer agent, CI result, or reproducible command evidence.
- The reviewer should record whether evidence was independently reproduced,
  inspected, or accepted from a trusted automation result.

### Evidence Independence

- Do not accept prose claims when an executable check, source registry record,
  migration artifact, or endpoint response can provide direct evidence.
- Do not accept fixture or seed data as validation evidence for production data
  correctness.
- Do not accept a green unit test as release validation when the risk is
  topology, database readiness, app/API proxying, or browser rendering.
- Do not accept release smoke evidence unless it identifies the tested URL,
  artifact or commit, database baseline, and result.
- Do not accept manual inspection as the only evidence for repeatable controls
  when a script or test can reasonably enforce the control.

### Risk-Based Independence Levels

- Level 1, low risk: documentation wording, comments, or traceability updates.
  One reviewer may inspect affected docs and related anchors.
- Level 2, moderate risk: local behavior, tests, script changes, or non-release
  implementation. Require targeted test evidence or independent source review.
- Level 3, high risk: API contracts, browser data flow, database readiness,
  source registry, migration artifacts, Docker topology, or release checks.
  Require independent review plus executable evidence from the relevant gate.
- Level 4, critical risk: production deployment, destructive database work,
  public API exposure, secret handling, provenance acceptance, or rollback
  changes. Require independent review, reproducible release evidence, rollback
  evidence, and explicit risk acceptance for any skipped gate.

## Recurring V&V Audit Checklist

Run this checklist after substantial implementation bundles, before release
candidates, and during monthly active-project standards review.

- Compare changed files against IEEE 830 requirements and confirm changed
  behavior has traceability.
- Compare changed interfaces and topology against IEEE 1016 design evidence.
- Compare changed tests, scripts, fixtures, and smoke checks against IEEE 829
  test documentation.
- Compare changed quality gates, dependency posture, and release controls
  against IEEE 730 SQA expectations.
- Compare changed configuration items, migrations, branch/release evidence, and
  generated outputs against IEEE 828 SCM controls.
- Confirm V&V evidence distinguishes verification results from validation
  conclusions.
- Confirm independent evidence exists at the level required by the risk class.
- Confirm data provenance and data-scope controls are reviewed for any
  data-facing change.
- Confirm Docker validation is used for deployment, database, proxy, or browser
  integration changes when Docker is available.
- Confirm skipped checks have reason, residual risk, owner area, and expiration
  or next trigger.
- Confirm accepted hardening and optimization recommendations have
  implementation targets and verification steps.
- Confirm this corpus or the formal IEEE 1012 V&V plan changes when new V&V
  duties, evidence, risks, or independence expectations are introduced.

## Hardening And Optimization Recommendation Rules

Create a required hardening recommendation when a V&V gap could allow:

- production use of fixture, seed, broad-scope, unlicensed, or unproven data
- public behavior changes without requirements, design, and test traceability
- API contract drift for `/v1/*`, `/healthz`, or `/readyz`
- deployment without fail-fast configuration, readiness evidence, smoke
  evidence, or rollback evidence
- database schema use without migration, read-only verification, readiness, or
  rollback traceability
- private API exposure, credential leakage, raw database error exposure, or
  weakened secret handling
- release promotion based only on self-attestation or insufficiently independent
  evidence
- standards documents that contradict each other on gates, requirements,
  topology, data policy, or release controls

Create a required verification recommendation when implementation, design, or
configuration changed but lacks executable or inspectable proof.

Create a required validation recommendation when the system may be correctly
built but the evidence no longer proves fitness for the intended product,
operational, data, or stakeholder purpose.

Create a required independence recommendation when the V&V conclusion depends
only on the change author's claim, a non-repeatable manual check, or evidence
from the wrong risk level.

Create an optimization recommendation only when it improves feedback speed,
observability, determinism, traceability, maintainability, or operator
ergonomics without weakening production gates or independence expectations.

Each recommendation must include:

- affected requirement, design view, test gate, data control, release control,
  or standards artifact
- evidence path, command, endpoint response, or observed gap
- verification risk, validation risk, and independence risk where applicable
- proposed change
- expected verification command or inspection step
- owner area, status, review date, and next trigger
- rollback or removal condition when the recommendation is temporary

Do not recommend broad rewrites, new frameworks, production import, production
deployment, public API exposure, destructive database changes, or expanded data
scope unless the requirements, design, test, provenance, release, rollback, and
independent V&V evidence are all explicit.

## Update Triggers

Update this corpus, the formal IEEE 1012 V&V plan, or both when any of these
occur:

- a new or changed IEEE 730, 828, 829, 830, 1016, or 1058 artifact changes V&V
  gates, traceability, risk classification, or independence expectations
- product vision, target users, supported decisions, or acceptance criteria
  change
- new or changed `/v1/*`, `/healthz`, `/readyz`, response envelope, error
  behavior, CORS behavior, gzip behavior, unsupported-method behavior, or
  browser data path
- frontend changes to map rendering, layer controls, sidebar controls, runtime
  configuration, static asset serving, fixture behavior, or browser smoke
  expectations
- database table, column, migration artifact, schema baseline, seed data,
  readiness contract, rollback expectation, or migration procedure changes
- data source, source registry schema, import script, provenance decision,
  blocked table resolution, or production data classification changes
- deployment topology, API visibility, Dockerfile, Compose file, CI workflow,
  environment variable, secret policy, health check, release smoke command, or
  rollback flow changes
- root scripts, package scripts, dependency policy, lockfile strategy, or npm
  audit posture changes
- failed test, failed release smoke, failed Docker validation, production
  incident, security finding, audit finding, or accepted residual risk exposes a
  missing V&V control
- an accepted hardening or optimization recommendation changes verification
  evidence, validation evidence, independence level, or recurring audit duties

## Audit Cadence

- Per implementation bundle: inspect changed surfaces, confirm traceability,
  and verify the risk-matched evidence before merge.
- Per release candidate: confirm requirements, design, tests, configuration,
  deployment, data provenance, release smoke, rollback, and independence
  evidence are complete enough for promotion.
- Monthly while active: review stale V&V evidence, skipped checks, open
  recommendations, provenance blockers, standards drift, and independence gaps.
- After incident or failed deployment: classify the V&V failure, update the
  affected evidence, add or strengthen the verification gate, and record any
  validation or independence impact.

## Finding Record Template

Use this structure when recording an IEEE 1012 V&V audit finding in a standards
document, issue, pull request, or release review:

```text
Finding:
Severity:
V&V area:
Independence level:
Affected requirement or design view:
Evidence:
Verification risk:
Validation risk:
Recommendation:
Verification step:
Status:
Owner area:
Review date:
Next trigger:
```

## Current Control Expectations

- Requirements, design, tests, configuration, deployment, and data provenance
  remain traceable through the standards corpus and project docs.
- Root npm scripts remain the authoritative local verification entrypoint.
- Docker validation remains the preferred compatibility check for database,
  proxy, deployment topology, and browser integration behavior when available.
- Production startup validates configuration and readiness; it must not mutate
  database schema.
- Fixture mode remains explicit and excluded from production-like paths.
- Puerto Rico-only, source-backed data remains the validation scope until a
  broader data scope is explicitly approved, documented, and independently
  verified.
- V&V conclusions for high-risk or critical changes require evidence beyond the
  change author's own assertion.
- Standards documentation is living control material and should be updated in
  the same bundle that changes the verified or validated behavior.
