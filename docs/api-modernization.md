# API Modernization Notes

## Target

- Runtime: current Node LTS/CI runtime.
- Initial replacement style: small HTTP compatibility server with isolated modern dependencies.
- Framework decision: deferred until more endpoints prove routing, validation, and database access needs.

## Current Slice

- `dtoapi/modern/server.js` implements the DB-free `/` endpoint and the first DB-backed `GET /v1/unis/{id}` route.
- `dtoapi/modern/root_contract.js` owns the shared response shape for that endpoint.
- `dtoapi/test/modern_root_contract_test.js` verifies status, JSON body, CORS headers, and gzip behavior.
- `dtoapi/modern/db.js` owns the modern Postgres connection boundary.
- `dtoapi/modern/unis.js` owns the compatibility query and response shape for university reads.
- `dtoapi/modern/test/uni_contract_test.js` verifies `GET /v1/unis/1` against the Docker-seeded database.

## Dependency Boundary

Modern API dependencies are isolated under `dtoapi/modern/package.json` so the legacy Nodal package remains installable and testable under the Node 8 compatibility container. The modern DB contract test runs in a separate Node 22 Compose service that shares the same Postgres seed data.

## Compatibility Rule

The modern API must pass preserved endpoint contracts before traffic can move away from Nodal. Keep new modern endpoints parallel until the matching legacy behavior is covered and verified.

## Next Slice

Continue migrating read endpoints behind the Docker-seeded DB contract. The next candidate is `/v1/muns/{id}` because it is another simple seeded read and can reuse the modern route, Postgres, and response helpers proven by `/v1/unis/{id}`.
