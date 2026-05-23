# API Modernization Notes

## Target

- Runtime: current Node LTS/CI runtime.
- Initial replacement style: small HTTP compatibility server with isolated modern dependencies.
- Framework decision: deferred until more endpoints prove routing, validation, and database access needs.

## Current Slice

- `dtoapi/modern/src/server.ts` implements the typed HTTP runtime for the DB-free `/` endpoint and the seeded DB-backed read routes.
- `dtoapi/modern/src/response_contract.ts` owns the typed shared response envelope, error envelope, and JSON serialization boundary.
- `dtoapi/modern/src/root_contract.ts` owns the typed shared response shape for the root endpoint.
- `dtoapi/test/modern_root_contract_test.js` verifies status, JSON body, CORS headers, and gzip behavior.
- `dtoapi/modern/src/db.ts` owns the typed Postgres connection boundary, environment-derived connection config, query callback contract, and pool close lifecycle.
- `dtoapi/modern/src/resource_contract.ts` owns typed resource definitions, public column order, row serialization, and `SELECT ... WHERE id = $1` query construction.
- `dtoapi/modern/src/records.ts` owns typed compatibility queries and response shapes for seeded read endpoints.
- `dtoapi/modern/test/db_contract_test.js` verifies the seeded read endpoint set and missing-record behavior against the Docker database.
- Known record routes reject unsupported methods with `405 Method Not Allowed` and avoid exposing raw database errors to clients.
- Canonical public routes use preserved resource/table names: `/v1/unis`, `/v1/muns`, `/v1/cdepts`, `/v1/cbps`, `/v1/businesses`, and `/v1/grade_cs`.
- The modern API also accepts `/v1/busines` and `/v1/grace_cs` as legacy typo aliases that resolve to `businesses` and `grade_cs`.
- `dtoapi/modern/test/response_contract_test.js` pins the typed response envelope.
- `dtoapi/modern/test/resource_contract_test.js` pins the typed resource/data-access boundary.
- `dtoapi/modern/test/records_contract_test.js` pins typed record payload wrapping without requiring a database.
- `dtoapi/modern/test/root_contract_test.js` pins the typed root response contract without requiring a server.
- `dtoapi/modern/test/server_contract_test.js` pins server route matching and gzip detection helpers without requiring a database.
- `dtoapi/modern/tsconfig.json` compiles TypeScript contract sources to ignored CommonJS output under `dtoapi/modern/lib/` before tests or runtime entrypoints execute.

## Dependency Boundary

Modern API dependencies are isolated under `dtoapi/modern/package.json`. The normal API toolchain no longer installs Nodal, and the obsolete Nodal source tree has been removed.

## Compatibility Rule

The modern API must pass preserved endpoint contracts before additional endpoint work is accepted. New work should extend modern contracts rather than reintroduce legacy runtime dependencies.

## JavaScript Ownership

- `dtoapi/test/modern_root_contract_test.js` and `dtoapi/modern/test/*.js` are compatibility tests that execute compiled TypeScript output.
- `dtoapi/modern/lib/` is ignored generated CommonJS output from the TypeScript build.
- No active API runtime source remains in handwritten JavaScript.

## Next Slice

Add new API behavior through typed sources under `dtoapi/modern/src/` and compatibility tests under `dtoapi/modern/test/`. Test migration to TypeScript is optional and lower priority than product behavior or CI hardening.
