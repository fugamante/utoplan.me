# Test Summary Report

ANSI/IEEE 829-1983-style summary for the modernization branch validation pass.

## Test Summary Identifier

`utoplan-modernization-20260524-demo-session`

## Scope

This report covers the current modernization branch after adding:

- live planning context with DB-backed CBP facts
- DB-backed seeded demo session/profile read model
- browser-local planning profile persistence
- production session/auth contract reservation
- reserved production session/profile table migration artifact
- anonymous session/profile API contract reservation with separate anonymous storage, route-specific CORS, CSRF, and caller-owned concurrency requirements
- anonymous session/profile migration artifact and threat-reviewed runtime sequence
- anonymous CORS/CSRF runtime scaffolding with gate-disabled endpoints still returning `501`
- anonymous token hashing, secure-cookie, transaction, and data-access scaffolding wired behind the activation gate
- anonymous rate-limit and profile body-validation scaffolding wired behind the activation gate
- endpoint-level reserved anonymous route contracts and production rate-limit policy helpers with gate-disabled endpoints still returning `501`
- transactional anonymous runtime composition helpers and separate anonymous schema readiness gates
- release-gated anonymous runtime activation controls
- reserved-route `429` response contracts and anonymous create/read/write/delete server mounting with same-origin/CSRF mutating checks and deleted-profile `410`
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
| Session/auth contract | `npm run test:session-auth-contract` | Pass |
| Migration artifact contracts | `npm run test:migration-artifacts` | Pass |
| Demo Compose configuration | `docker compose -f docker-compose.demo.yml config` | Pass |
| Demo Compose runtime smoke | `docker compose -f docker-compose.demo.yml up --build -d` plus `npm run verify:release-smoke` with `UTOPLAN_DEMO_SESSION_ID=demo-session-1` | Pass |

Current anonymous migration/runtime sequence slice rerun:

- `npm run test:session-auth-contract`: Pass
- `npm run test:migration-artifacts`: Pass
- `npm test`: Pass
- `npm run docker:test:modern-db`: Pass
- `npm run docker:test:proxy`: Pass
- `node test/browser_smoke_test.js`: Pass
- `docker compose -f docker-compose.demo.yml config`: Pass

Current anonymous CORS/CSRF scaffolding slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass

Current anonymous data-access/token scaffolding slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass

Current anonymous rate-limit/body-validation scaffolding slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass

Current anonymous endpoint/rate-limit policy slice rerun:

- `npm --prefix dtoapi/modern test`: Pass

Current anonymous transaction/schema-gate slice rerun:

- `npm --prefix dtoapi/modern test`: Pass

Current anonymous runtime activation gate slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous reserved-rate-limit/handler-composition slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous write/delete handler-composition slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous gated server-runtime slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous limiter activation-contract slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:deployment-config`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous release-smoke coverage slice rerun:

- `npm run test:release-smoke`: Pass
- `node --check scripts/release_smoke_check.js && node --check test/release_smoke_check_test.js`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `git diff --check`: Pass

Current anonymous shared-limiter provider slice rerun:

- `npm --prefix dtoapi/modern test`: Pass
- `npm run test:migration-artifacts`: Pass
- `npm run test:session-auth-contract`: Pass
- `npm test`: Pass
- `npm run docker:test:proxy`: Pass
- `npm run docker:test:modern-db`: Pass
- `git diff --check`: Pass

## Evaluation

The tested branch satisfies the current modernization acceptance criteria for:

- reproducible root validation
- Docker-backed API validation
- DB-backed planning-context facts
- seeded DB-backed demo session composition
- operational readiness protection for the required demo session table
- demo release smoke coverage when `UTOPLAN_DEMO_SESSION_ID` is supplied
- opt-in anonymous release smoke coverage when `UTOPLAN_ANONYMOUS_SMOKE=1` is supplied
- Postgres-backed shared anonymous limiter storage contract and async mounted-runtime limiter decisions

## Anomalies

None observed in the validation commands listed above.

## Residual Risks

- Production-grade user accounts, passwords, and privacy controls are not implemented.
- Anonymous session/profile runtime endpoints are mounted behind a fail-closed activation gate, but production exposure still depends on applying the anonymous migration artifacts in the target database, proxy evidence, explicit edge/shared limiter attestation, and running the opt-in smoke against the candidate environment.
- Demo seed data is intentionally non-production and should not be confused with a complete source-backed product dataset.
- CBP field semantics still carry low transform confidence.
- Planning signals remain intentionally absent until more source-backed data and product rules are defined.

## Approval

Prepared for branch evidence. Final release approval remains an operator decision after reviewing source provenance, migration readiness, and deployment environment settings.
