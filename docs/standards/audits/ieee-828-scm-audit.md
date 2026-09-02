# IEEE 828 Software Configuration Management Audit Corpus

Status: active audit guide  
Scope: utoplan.Me Modernization fork  
Standard focus: IEEE 828 Software Configuration Management Plan  
Owning corpus file: `docs/standards/audits/ieee-828-scm-audit.md`

## Purpose

This corpus guides recurring audits of the project's configuration management
practice. It is not the full SCM plan. It defines the evidence, checks,
recommendation rules, and update triggers that keep the IEEE 828 plan honest as
the modernization fork changes.

The current project baseline is a two-service Node deployment: `app` serves the
static frontend and same-origin `/v1/*` proxy, `dtoapi/modern` serves the modern
TypeScript API, and PostgreSQL provides authoritative read data. Configuration
management must preserve reproducible builds, traceable releases, controlled
database change artifacts, source provenance, and rollback-ready deployment
pairs.

## Configuration Items

Audit these configuration item classes on every SCM review:

- Source code: `app/`, `dtoapi/`, `scripts/`, first-party TypeScript sources,
  static server glue, and tests.
- Build and dependency manifests: root `package.json`, package lockfiles,
  service-level package manifests, `.node-version`, `.nvmrc`, TypeScript
  configuration, Dockerfiles, and Compose files.
- Runtime configuration contracts: documented environment variables, production
  verifier scripts, health/readiness endpoints, and proxy mode settings.
- Database artifacts: `db/migrations/`, `db/migrations/TEMPLATE.md`, readiness
  schema contracts, seed/test database assets, and migration documentation.
- Data provenance assets: `data/sources/puerto-rico.json`,
  `docs/data-intake.md`, `docs/data-provenance.md`, and fixture/test data.
- Product-boundary and planning-context assets: `docs/product-scope.md`,
  `docs/business-location-decision-framework.md`,
  `docs/production-readiness-decision-board.md`,
  `data/mappings/puerto-rico-business-categories.json`,
  `data/municipalities/planning-context-municipalities.json`,
  `data/naics/planning-context-naics-titles.json`, and
  `data/planning-context/`.
- Release evidence: CI definitions, release smoke scripts, Docker validation
  commands, production runbooks, rollback instructions, tags, branches, commits,
  and pull requests.
- Standards documentation: IEEE corpus files, generated plans, audit notes, and
  unresolved recommendation records.

## Evidence Register

Collect or inspect this evidence before issuing an IEEE 828 audit finding:

- Repository state: `git status --short`, current branch, latest commit subject,
  and whether work is based on the intended Modernization fork branch.
- Change intent: linked issue, PR, branch name, commit message, or local task
  note explaining why the change exists.
- Build reproducibility: `npm run install:all`, `npm run build`, and lockfile
  changes that match package manifest changes.
- Runtime reproducibility: `.node-version`, `.nvmrc`, package `engines`, CI,
  and `scripts/verify_node_runtime.js` agree on the reviewed Node major.
- Test baseline: `npm run test`, `npm run test:browser`,
  `npm run test:data-sources`, `npm run test:business-categories`,
  `npm run test:planning-context`, and service-specific tests when the change
  is narrower.
- Docker compatibility: `npm run docker:test:db`,
  `npm run docker:test:proxy`, and
  `npm run docker:test:start-local-browser` when Docker is available.
- Deployment controls: `npm run verify:deployment`,
  `npm run verify:release`, `npm run verify:release-smoke`, `/healthz`, and
  `/readyz` behavior when runtime configuration or deployment topology changes.
- Security hygiene: root and service npm audits, secret scans by inspection for
  committed credentials, and confirmation that production `.env` exports are
  not tracked.
- Database control: migration artifact completeness, rollback procedure,
  readiness contract updates, and confirmation that app/API startup does not
  mutate schema.
- Data control: source registry entries, Puerto Rico-only scope enforcement,
  license/source URLs, retrieval dates, category-mapping traceability,
  planning-context fixture boundaries, profile/reach contract and
  decision-signal registry linkage, reviewed signal artifacts, and separation
  of fixture, seed, and production data.
- Documentation trace: README, roadmap, deployment topology, production
  deployment runbook, product scope, data intake/provenance notes, and
  database migration strategy updated when behavior changes.

## Recurring Audit Checklist

### Identification And Baseline Control

- Configuration items are named, located, and documented in README or relevant
  docs.
- Generated outputs and dependency folders remain ignored and absent from source
  control.
- Lockfiles change only with manifest or dependency-resolution changes.
- Node runtime pins remain synchronized across `.node-version`, `.nvmrc`,
  package metadata, CI, and runtime-verifier scripts.
- Branch names, commit subjects, PR titles, and release notes avoid personal
  identifiers and AI/tool/vendor labels.
- The current baseline can be reconstructed from repository files, documented
  environment variables, and migration artifacts.

### Change Control

- Each behavioral change has a reviewable diff and a stated reason.
- Changes that affect app/API contracts include tests or documented validation.
- Mutating database changes are represented as explicit artifacts under
  `db/migrations/`.
- Destructive or incompatible schema changes are separated from application code
  rollout unless an approved release plan says otherwise.
- Production configuration changes are documented in the deployment runbook or
  deployment topology before release.

### Status Accounting

- Roadmap status reflects completed modernization work and current next step.
- Release or deployment documentation identifies the build artifact, commit,
  schema baseline, validation commands, and rollback expectation.
- Data-source status identifies candidate, accepted, blocked, fixture, seed, and
  production data separately.
- Product-scope status identifies whether planning-context behavior is still
  descriptive and backed by visible confidence and limitation evidence.
- Planned profile/reach status distinguishes canonical requirements and design
  evidence from schemas, fixtures, and tests that do not exist yet.
- Open provenance gaps remain visible until evidence is found or replacement
  sources are formally accepted.
- Audit findings record recommendation state: proposed, accepted, implemented,
  deferred, rejected, or superseded.

### Audits And Reviews

- Focused checks run after narrow edits; the full validation stack runs before a
  coherent release bundle when feasible.
- Docker validation is used when Docker is available and the change touches
  deployment, database, proxy, or browser integration behavior.
- Security-sensitive changes include dependency audit and secret exposure
  checks.
- Data intake changes include registry validation and source-scope review.
- Profile/reach and signal-review changes keep the contract, signal registry,
  source registry, reviewed artifact, focused test, and root test inventory in
  one controlled change set.
- SCM audit updates are committed with the standards documentation bundle or the
  change that invalidated prior controls.

### Release And Delivery Control

- App and API artifacts are built from the same intended commit for integrated
  releases.
- API remains private behind the app proxy in the documented topology.
- `UTOPLAN_DEMO_FIXTURE` is absent from production releases.
- `/readyz` gates API database readiness and schema baseline compatibility.
- Rollback instructions identify app, API, and database recovery order.

## Active Recommendations

### RECO-828-2026-08-05-01

- Class: runtime configuration hardening
- Finding: the production app Dockerfile did not declare an unprivileged
  runtime user, leaving its service command dependent on the base image's root
  default even though the production API already used `node`.
- Acceptance evidence:
  - `Dockerfile` assigns `/workspace` to `node:node` and declares `USER node`
    before `CMD`.
  - `test/deployment_container_contract_test.js` fails if the app user
    declaration is absent or follows the service command.
  - Focused container-contract validation and the production app image build
    pass.
- Revisit trigger:
  - Any production Dockerfile, base-image user, filesystem-write requirement,
    service command, or container-contract test change.
- Status: implemented (2026-08-05) in `6de22e5`; the app and API production
  runtimes now share the controlled unprivileged `node` boundary.

### RECO-828-2026-08-01-01

- Class: supply-chain reproducibility optimization
- Finding: all Node-based Dockerfiles consistently select
  `node:26-bookworm-slim`, but the tag is mutable. The verified release build
  resolved it to OCI index digest
  `sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73`,
  while the 2026-08-25 app-image validation resolved the same tag to
  `sha256:4db36457f406501e6f608802e5da617e5fbd0e80b75901b6a09de1ae5a667d32`,
  and the 2026-09-01 refresh review resolved it again to
  `sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e`.
  The observed drift confirms that rebuilding the same commit after a tag
  update can produce different base layers.
- Acceptance evidence:
  - Every Node-based `FROM` instruction uses the same reviewed
    `node:26-bookworm-slim@sha256:<index-digest>` reference.
  - A documented automated or scheduled refresh process updates the digest so
    security fixes are not indefinitely excluded by reproducibility controls.
  - Root and modern API image builds, image runtime/user inspection, the full CI
    workflow, and DB/proxy/browser Docker checks pass after a digest refresh.
- Revisit trigger:
  - The next Node 26 base-image refresh, relevant base-image security advisory,
    or release-hardening pass, whichever occurs first.
- Status: operational and validated on `master` (2026-09-02). All six Node
  stages use the reviewed
  `sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e`
  index digest, `.github/dependabot.yml` performs weekly Docker update
  discovery, the modernization maintainer owns review and advisory response,
  `test/deployment_container_contract_test.js` rejects partial or unreviewed
  refreshes, and `docs/container-base-refresh.md` defines validation and
  rollback. PR #18 placed the configuration on `master`.
- Operational evidence:
  - GitHub dependency automation generated Docker PR #21 at
    `35bef56103882063bb6211146ee98fc73c6cf378`, establishing activation of the
    weekly discovery path. Exact-head run `33396122699` failed at the
    deployment-container contract because the proposed digest differed from
    the previously reviewed oracle. This was the intended fail-closed review
    gate; PR #21 did not pass or merge.
  - The modernization maintainer coordinated the digest, contract-oracle, and
    IEEE evidence updates in PR #23 at
    `b84db5ce93bfdd5b43af029a129f0adc57172a4b`. Exact-head run `33594626470`
    passed, the change merged as
    `49612071ca7485263a0c90aa652c3a7bb5a94978`, and exact-master run
    `33597376960` passed.
  - This sequence completes the two-stage control in
    `docs/container-base-refresh.md`: a generated pull request establishes
    automated discovery, then exact-SHA validation of the coordinated,
    maintainer-reviewed refresh establishes acceptance. Generated discovery
    does not authorize automatic merge or weaken the fail-closed oracle.

## Hardening And Optimization Recommendation Rules

Open a hardening recommendation when an SCM control weakness can create an
unreviewed, unreproducible, insecure, or non-rollbackable state.

Use these thresholds:

- Critical: production secrets, destructive schema mutation on startup,
  unrecoverable release path, or public traffic served from fixture data.
- High: missing migration rollback, unpinned dependency drift, broken readiness
  contract, data source imported without license/scope evidence, or untested
  app/API contract change.
- Medium: documentation drift that can mislead release operators, incomplete
  validation evidence, unclear ownership of configuration items, or missing
  provenance status.
- Low: naming, formatting, or traceability gaps that do not immediately affect
  build, release, rollback, or source trust.

Prefer recommendations that are:

- Evidence-backed by a file path, command result, or observed behavior.
- Small enough to implement in one cohesive change bundle.
- Written as an operator-safe control, not a vague process preference.
- Paired with a verification command or inspection step.
- Recorded in the relevant standards corpus or project documentation once
  accepted.

Do not recommend broad framework rewrites as SCM hardening unless the finding
is specifically about configuration control, reproducibility, release safety, or
traceability.

## Update Triggers

Update this corpus, the IEEE 828 SCM plan, or both when any of these occur:

- New service, package, runtime, Docker image, deployment target, or CI workflow.
- Any dependency management policy change, lockfile strategy change, or package
  manager change.
- New or changed database migration artifact format, readiness schema baseline,
  production migration process, or seed-data workflow.
- New data source, source registry schema change, provenance discovery, import
  script, or production data classification decision.
- New release, rollback, or environment configuration requirement.
- Any control failure found during review, CI, release smoke, Docker validation,
  security audit, or production incident response.
- Any accepted recommendation that changes how configuration items are named,
  reviewed, built, verified, released, or retired.
- Any standards-document generation pass that changes IEEE 730, 828, 829, 830,
  1012, 1016, or 1058 documents.

## Audit Cadence

- Per change bundle: inspect SCM-relevant diffs before merge.
- Per release candidate: verify evidence register completion and rollback
  readiness.
- Monthly while active: review open recommendations, stale documentation, data
  provenance gaps, and baseline drift.
- After incident or failed deployment: add a finding, classify severity, record
  evidence, and update the relevant control once corrected.

## Finding Record Template

Use this structure when adding a finding to the IEEE 828 plan or an issue/PR:

```text
Finding:
Severity:
Configuration item:
Evidence:
Risk:
Recommendation:
Verification:
Status:
Owner:
Review date:
```

## Current Control Expectations

- Root scripts remain the authoritative local validation entrypoint.
- Docker validation remains the preferred compatibility check for deployment,
  database, proxy, and browser integration behavior when available.
- Production startup validates configuration and readiness; it must not mutate
  database schema.
- Migration artifacts remain explicit release artifacts under `db/migrations/`.
- Fixture mode remains limited to explicit offline demos and tests.
- Source-backed Puerto Rico data remains the accepted data scope until broader
  scope is explicitly approved and documented.
- Candidate business-category mappings and planning-context fixtures remain
  controlled artifacts and must not become implicit scoring logic without a
  documented standards and release update.
- Standards documentation is living project control material and should be
  updated in the same bundle that changes the controlled behavior.
