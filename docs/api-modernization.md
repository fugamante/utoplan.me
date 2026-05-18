# API Modernization Notes

## Target

- Runtime: current Node LTS/CI runtime.
- Initial replacement style: small HTTP compatibility server with isolated modern dependencies.
- Framework decision: deferred until more endpoints prove routing, validation, and database access needs.

## Current Slice

- `dtoapi/modern/server.js` implements the DB-free `/` endpoint and the seeded DB-backed read routes.
- `dtoapi/modern/response_contract.js` owns the shared response envelope, error envelope, and JSON serialization boundary.
- `dtoapi/modern/root_contract.js` owns the shared response shape for that endpoint.
- `dtoapi/test/modern_root_contract_test.js` verifies status, JSON body, CORS headers, and gzip behavior.
- `dtoapi/modern/db.js` owns the modern Postgres connection boundary.
- `dtoapi/modern/records.js` owns compatibility queries and response shapes for seeded read endpoints.
- `dtoapi/modern/test/db_contract_test.js` verifies the seeded read endpoint set and missing-record behavior against the Docker database.
- Known record routes reject unsupported methods with `405 Method Not Allowed` and avoid exposing raw database errors to clients.
- `dtoapi/modern/test/response_contract_test.js` pins the TypeScript-ready response envelope before typed migration begins.

## Dependency Boundary

Modern API dependencies are isolated under `dtoapi/modern/package.json`. The normal API toolchain no longer installs Nodal, and the obsolete Nodal source tree has been removed.

## Compatibility Rule

The modern API must pass preserved endpoint contracts before additional endpoint work is accepted. New work should extend modern contracts rather than reintroduce legacy runtime dependencies.

## Next Slice

Continue by moving shared response and data access shapes toward TypeScript-ready boundaries, then add any newly discovered API behavior as modern contract tests before implementation.
