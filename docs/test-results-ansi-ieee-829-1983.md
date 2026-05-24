# Test Summary Report

ANSI/IEEE 829-1983-style summary for the modernization branch validation pass.

## Test Summary Identifier

`utoplan-modernization-20260524-demo-session`

## Scope

This report covers the current modernization branch after adding:

- live planning context with DB-backed CBP facts
- DB-backed seeded demo session/profile read model
- browser-local planning profile persistence
- Docker Postgres demo seed and demo Compose topology
- readiness coverage for the required demo session table
- release smoke support for demo-session validation

## Test Items

- Root workspace scripts and contract tests
- Static app build and smoke tests
- Modern API TypeScript build and unit contracts
- Modern API Docker/Postgres DB contract
- App-origin proxy to modern API
- Migration artifact format checks
- Data source, mapping, normalization, provenance, planning, load, writer-gate, and release-evidence checks
- Release preflight and release smoke scripts

## Environment

- Date: 2026-05-24
- Branch: `modernization/sandbox`
- Runtime: Node.js/npm through project scripts
- Container validation: Docker Compose with seeded Postgres
- Database: disposable Docker Postgres seeded by `docker/postgres/init.sql`

## Variances

- The demo session is a seeded local/demo read model, not production authentication.
- Source-backed planning remains confidence-limited. No scores, recommendations, or feasibility claims are produced.
- Blocked legacy tables remain blocked for planning use until source provenance is resolved.

## Summary Of Results

| Test | Command | Result |
| --- | --- | --- |
| Modern API unit/contracts | `npm --prefix dtoapi/modern test` | Pass |
| Root validation stack | `npm test` | Pass |
| Docker DB-backed API contract | `npm run docker:test:modern-db` | Pass |
| Docker app/API proxy contract | `npm run docker:test:proxy` | Pass |
| Static app profile contracts | `npm --prefix app test` | Pass |
| Browser profile persistence smoke | `node test/browser_smoke_test.js` | Pass |
| Demo Compose configuration | `docker compose -f docker-compose.demo.yml config` | Pass |
| Demo Compose runtime smoke | `docker compose -f docker-compose.demo.yml up --build -d` plus `npm run verify:release-smoke` with `UTOPLAN_DEMO_SESSION_ID=demo-session-1` | Pass |

## Evaluation

The tested branch satisfies the current modernization acceptance criteria for:

- reproducible root validation
- Docker-backed API validation
- DB-backed planning-context facts
- seeded DB-backed demo session composition
- operational readiness protection for the required demo session table
- demo release smoke coverage when `UTOPLAN_DEMO_SESSION_ID` is supplied

## Anomalies

None observed in the validation commands listed above.

## Residual Risks

- Production-grade user accounts, passwords, and privacy controls are not implemented.
- Demo seed data is intentionally non-production and should not be confused with a complete source-backed product dataset.
- CBP field semantics still carry low transform confidence.
- Planning signals remain intentionally absent until more source-backed data and product rules are defined.

## Approval

Prepared for branch evidence. Final release approval remains an operator decision after reviewing source provenance, migration readiness, and deployment environment settings.
