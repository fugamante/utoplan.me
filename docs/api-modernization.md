# API Modernization Notes

## Target

- Runtime: current Node LTS/CI runtime.
- Initial replacement style: small dependency-free HTTP compatibility server.
- Framework decision: deferred until DB-backed endpoint migration proves the routing, validation, and database access needs.

## Current Slice

- `dtoapi/modern/server.js` implements the DB-free `/` endpoint.
- `dtoapi/modern/root_contract.js` owns the shared response shape for that endpoint.
- `dtoapi/test/modern_root_contract_test.js` verifies status, JSON body, CORS headers, and gzip behavior.

## Compatibility Rule

The modern API must pass preserved endpoint contracts before traffic can move away from Nodal. Keep new modern endpoints parallel until the matching legacy behavior is covered and verified.

## Next Slice

Migrate `/v1/unis/{id}` behind the Docker-seeded DB contract. This is the smallest DB-backed read path and should establish the modern data access boundary before broader framework selection.
