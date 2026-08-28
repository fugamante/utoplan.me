# IEEE Control Applicability

- Status: accepted standard-profile baseline
- Assessed on: 2026-08-05
- Next scheduled review: 2027-02-05
- Owner role: Modernization maintainer
- Approver role: Release reviewer for release-impacting changes

This record describes tailored engineering controls. It does not claim IEEE
certification, formal compliance, or audited assurance.

## Profile decision

Selected profile: `standard`.

The project is an actively maintained, production-oriented web application and
API with persistent PostgreSQL data, containerized deployment, public app/API
contracts, database migration controls, release commitments, and a substantial
legacy-modernization surface. Those characteristics require controlled
baselines and traceable acceptance evidence.

Current repository evidence does not establish a project-wide
`high-assurance` floor: the documented data scope is public and Puerto
Rico-focused, the public product is descriptive rather than an automated
financial/legal recommendation engine, the API is read-oriented, and no formal
safety, regulatory, or contractual assurance obligation was found. These are
bounded observations, not proof that higher-impact use is absent.

## Risk and lifecycle screen

| Signal | Result | Evidence or disposition |
| --- | --- | --- |
| External users or production operation | Yes | Production deployment, release preflight/smoke, public app origin, and maintained API contracts exist. |
| Persistent or sensitive data | Persistent; no sensitive-data evidence found | PostgreSQL and registered public-data sources are in scope; reassess before accounts, personal data, or confidential inputs. |
| Secrets, privileged action, or security boundary | Yes, controlled | Deployment secrets are external; API is private in integrated topology; containers use an unprivileged runtime user. |
| Material safety, financial, privacy, or operational impact | Unresolved boundary | Product supports business planning but explicitly avoids ranking/recommendation certainty; consequential automation raises the profile. |
| Binding assurance obligation | No evidence found | Reassess on customer, procurement, legal, regulatory, or contractual requirements. |
| Hard-to-reverse or destructive action | Conditional | Migration artifacts exist; production migration execution remains operator-managed and write-capable paths require reassessment. |
| Maintained shared interfaces or releases | Yes | Public routes, response envelopes, browser paths, schema readiness, and release gates are controlled. |
| Legacy, supplier, or reused-component risk | Yes | Modernization preserves legacy read behavior and depends on source registries, lockfiles, container bases, and data authorities. |

## Family decisions

| Family | Decision | Controlled artifact and audit | Owner role | Acceptance criterion | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| IEEE 730 | Adopted | `ieee-730-sqa-plan.md`; `audits/ieee-730-sqa-audit.md` | Modernization maintainer | Applicable quality gates pass; exceptions identify owner, evidence, risk, and expiry | Quality gate, metric, incident, waiver, or release-policy change |
| IEEE 828 | Adopted | `ieee-828-scm-plan.md`; `audits/ieee-828-scm-audit.md` | Configuration/release owner | Baseline, configuration items, change, build, release, rollback, and status records are traceable | Branch, dependency, CI, container, schema, release, or retention change |
| IEEE 829 / ISO/IEC/IEEE 29119 | Adopted | `ieee-829-test-document.md`; `audits/ieee-829-test-audit.md` | Test owner | Risk-relevant test commands pass and anomalies/skips have disposition | Interface, environment, test-data, command, provider, or failure change |
| IEEE 830 / ISO/IEC/IEEE 29148 | Adopted | `ieee-830-srs.md`; `audits/ieee-830-srs-audit.md` | Product owner | Requirements are identified, reviewable, versioned, and mapped to acceptance evidence | Scope, user, source, route, data, constraint, or acceptance change |
| IEEE 1016 | Adopted | `ieee-1016-design-description.md`; `audits/ieee-1016-design-audit.md` | Technical owner | Architecture, interfaces, data flow, deployment, and decisions match implementation evidence | Topology, trust boundary, schema, API, frontend, or migration change |
| IEEE 1012 | Adopted | `ieee-1012-vv-plan.md`; `audits/ieee-1012-vv-audit.md` | V&V reviewer | Requirements-to-design-to-test trace is current; release-impacting evidence receives separate review | Integrity/risk change, failed evidence, incident, waiver, or release change |
| IEEE 1058 / ISO/IEC/IEEE 16326 | Adopted | `ieee-1058-project-management-plan.md`; `audits/ieee-1058-project-audit.md` | Modernization maintainer | Scope, lifecycle, roles, milestones, dependencies, risks, and reporting remain current | Ownership, lifecycle, roadmap, supplier, budget, schedule, or obligation change |

## Evidence, acceptance, and freshness

- Evidence register: `evidence-register.md`.
- Canonical details: the seven plan/specification documents and their paired
  audit corpuses; this record does not supersede them.
- Retention: controlled documents, requirements, tests, migration artifacts,
  source/provenance records, and release records remain in Git or the applicable
  CI/deployment system. Secrets and private environment dumps are excluded.
- Scheduled review: no later than 2027-02-05; per-change, per-release, weekly
  active-development, and incident triggers in `README.md` are stricter and
  remain authoritative.

## High-assurance escalation triggers

Reassess before introducing personal or confidential data, authentication or
tenant isolation, a direct public API trust-boundary change, write-capable
production data paths, irreversible migration automation, automated scoring or
ranking, financial/legal eligibility or approval claims, safety-critical use,
binding assurance obligations, or a material security/privacy incident.

Until resolved, any change touching those signals uses the higher plausible
profile for the affected control family and cannot be promoted on the standard
baseline alone.

## Exceptions

None. Any lowering or omission requires explicit authorization plus owner,
scope, rationale, compensating evidence, approval date, expiry or next review,
and event-driven revisit triggers.
