# Roadmap Phase Summaries

## Phase 1: Baseline And Hygiene

Established root scripts, ignored generated dependencies, restored normal install/build/test behavior, and captured the compatibility baseline.

Evidence:

- `npm run build`
- `npm test`

## Phase 2: Dependency Reproducibility

Removed committed dependency trees from the normal project path, generated lockfiles, moved away from legacy runtime exposure, and made Docker build/test paths lockfile-backed.

Evidence:

- `npm run install:all`
- `npm audit` through current lockfile-backed package sets

## Phase 3: API Compatibility And Data Provenance

Replaced the obsolete API runtime with a modern TypeScript API slice while preserving seeded read contracts. Added source registry, provenance/confidence metadata, data mapping, normalization, dry-run load planning, SQL preview, writer gate, source metadata endpoint, planning context fixture, and live planning context with CBP facts.

Evidence:

- `npm --prefix dtoapi/modern test`
- `npm run docker:test:modern-db`
- `GET /v1/source-metadata`
- `GET /v1/planning/context?municipality=1&category=professional_services`

## Phase 4: Frontend Static App

Separated first-party frontend code from vendored assets, moved map/data behavior behind typed modules, added browser/static smoke tests, and routed app-origin `/v1/*` requests to the modern API by default.

Evidence:

- `npm --prefix app test`
- `npm run docker:test:proxy`
- `npm run docker:test:start-local-browser`

## Phase 5: Framework Replacement

Retired the legacy Nodal runtime from the normal dependency graph and kept the replacement API intentionally small while endpoint behavior is pinned by compatibility tests.

Evidence:

- `dtoapi/modern/src/server.ts`
- `dtoapi/modern/src/resource_contract.ts`
- `dtoapi/modern/test/db_contract_test.js`

## Phase 6: TypeScript Adoption

Moved active API runtime boundaries and first-party browser behavior into TypeScript while leaving tests and compatibility glue in JavaScript where that remains pragmatic.

Evidence:

- `npm --prefix dtoapi/modern run build`
- `npm --prefix app run build`

## Current Demo/Product Slice

The branch now has a DB-backed demo path:

- Docker Postgres seeded with source-backed candidate read data and a neutral demo session
- `GET /v1/planning/context` for live municipality/category context
- `GET /v1/demo/session?session=demo-session-1` for saved demo profile plus live context
- browser-local planning profile panel for local business idea, municipality, and category preferences
- production session/auth contract reserved without enabling account endpoints
- `docker-compose.demo.yml` for a runnable local DB-backed demo

Remaining product work:

- browser-local saved profile flow
- production authentication/session design
- migration artifacts for reserved production session/profile tables
- richer source-backed demo dataset
- final audit after the remaining roadmap items are complete
