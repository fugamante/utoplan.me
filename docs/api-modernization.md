# API Modernization Notes

## Target

- Runtime: current Node LTS/CI runtime.
- Initial replacement style: small HTTP compatibility server with isolated modern dependencies.
- Framework decision: deferred until more endpoints prove routing, validation, and database access needs.

## Current Slice

- `dtoapi/modern/src/server.ts` implements the typed HTTP runtime for the DB-free `/` endpoint and the seeded DB-backed read routes.
- `dtoapi/modern/src/response_contract.ts` owns the typed shared response envelope, error envelope, and JSON serialization boundary.
- `dtoapi/modern/src/root_contract.ts` owns the typed shared response shape for the root endpoint.
- `dtoapi/modern/src/source_metadata.ts` owns the DB-free source metadata endpoint contract for Puerto Rico-only planning data provenance.
- `dtoapi/modern/src/planning_context.ts` owns the DB-free demo planning context contract for fixture-backed municipality/category facts.
- `dtoapi/modern/src/demo_session.ts` owns the first DB-backed local demo session/profile contract and composes it with the live planning context response.
- `dtoapi/modern/src/anonymous_security.ts` owns anonymous opaque token generation, SHA-256 token hashing, timing-safe verification, CSRF token verification, anonymous session cookie construction, and cookie parsing helpers.
- `dtoapi/modern/src/anonymous_profile.ts` owns anonymous session/profile SQL builders, row mappers, response envelopes, and caller-owned optimistic write/delete query shapes without enabling runtime routes.
- `dtoapi/test/modern_root_contract_test.js` verifies status, JSON body, CORS headers, and gzip behavior.
- `dtoapi/modern/src/db.ts` owns the typed Postgres connection boundary, environment-derived connection config, query callback contract, transaction helper, and pool close lifecycle.
- `dtoapi/modern/src/resource_contract.ts` owns typed resource definitions, public column order, row serialization, and `SELECT ... WHERE id = $1` query construction.
- `dtoapi/modern/src/records.ts` owns typed compatibility queries and response shapes for seeded read endpoints.
- `dtoapi/modern/test/db_contract_test.js` verifies the seeded read endpoint set and missing-record behavior against the Docker database.
- Known record routes reject unsupported methods with `405 Method Not Allowed` and avoid exposing raw database errors to clients.
- Canonical public routes use preserved resource/table names: `/v1/unis`, `/v1/muns`, `/v1/cdepts`, `/v1/cbps`, `/v1/businesses`, and `/v1/grade_cs`.
- The modern API also accepts `/v1/busines` and `/v1/grace_cs` as legacy typo aliases that resolve to `businesses` and `grade_cs`.
- Collection routes accept optional integer `limit` and `offset` query parameters. `limit` must be between `1` and `1000`; `offset` must be zero or greater. Unknown query parameters are ignored for compatibility.
- Collection response metadata reports `total` as the full resource count, `count` as the returned page length, and `offset` as the applied offset.
- Collection filtering and sorting are not supported yet. Query parameters such as `filter`, `sort`, `q`, or domain-specific planning filters are intentionally ignored until source-backed data semantics and provenance/confidence metadata are defined.
- `/v1/source-metadata` exposes the checked-in provenance/confidence contract as read-only API metadata. It distinguishes source-backed candidate tables (`cbps`, `muns`, `unis`) from blocked tables (`cdepts`, `businesses`, `grade_cs`) without connecting to the database.
- `/v1/planning/context-demo` exposes the fixture-backed planning context read model. It returns selected municipality/category data, source-backed CBP facts, confidence, unresolved questions, and no scores or recommendations.
- `/v1/planning/context` is the DB-backed planning context endpoint. It accepts only `municipality=<positive integer>` and `category=<candidate business category id>`. The first live slice resolves municipality and category, attaches matching source-backed CBP facts, returns no signals or scores, returns `404 Not Found` when the municipality is absent, and returns `400 Bad Request` for invalid or unsupported query parameters.
- `/v1/demo/session` is the DB-backed local demo session endpoint. It accepts only `session=<known demo session id>`, returns the saved neutral demo profile plus the live planning context for its selected municipality/category, returns `404 Not Found` when the session is absent, and returns `400 Bad Request` for invalid or unsupported query parameters. It is not an authentication or account-management API. Production-mode deployments must set `UTOPLAN_DEMO_SESSIONS=1` before the route is exposed.
- Production session/profile endpoints are reserved but not implemented. `docs/session-auth-contract.md` and `data/mappings/puerto-rico-session-auth-contract.json` define the required privacy, retention, authentication, migration, and audit gates before routes such as `/v1/session/login` or `/v1/profile` can be added.
- Anonymous session/profile endpoints are contract-reserved but not implemented. The reserved shape is `POST /v1/anonymous-sessions`, `GET /v1/profile`, `PUT /v1/profile`, and `DELETE /v1/profile`; it requires same-origin cookie ownership, hash-only token storage, route-specific non-wildcard CORS, CSRF protection for writes, row-version optimistic concurrency with caller ownership in the same update, the anonymous-compatible storage migration artifact `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md`, the runtime sequence in `docs/anonymous-session-runtime-sequence.md`, and explicit non-use of `demo_sessions` or password-account rows for anonymous profile storage.
- Anonymous CORS/CSRF scaffolding is implemented without enabling the reserved endpoints. Reserved anonymous route methods still return `501 Not Implemented`, while route-specific preflight handling rejects disallowed Origins, avoids wildcard CORS, allows only configured Origins, requires strict same-origin signals for session bootstrap, and gates `PUT`/`DELETE` on `X-CSRF-Token` header presence.
- Anonymous token/data-access scaffolding is implemented without enabling the reserved endpoints. Token helpers generate high-entropy base64url secrets, store only hashes, verify with timing-safe comparison, omit cookie `Domain`, and expose clear-cookie helpers. Data-access helpers reserve SQL for active session lookup, active/deleted profile distinction, row-version profile updates, caller-owned soft delete, session revocation, and audit event inserts.
- Anonymous rate-limit and profile body-validation scaffolding is implemented without enabling the reserved endpoints. The rate-limit helper is unit-test-only process-local fixed-window scaffolding; it resets on restart, is per Node process, does not coordinate across containers or regions, and must not gate public anonymous endpoints. Profile validation enforces the 2048-byte body cap before parsing, allowed fields only, positive integer municipality ids, category id pattern checks, and 160-character `businessIdea` limit.
- Anonymous transaction and schema-gate scaffolding is implemented without enabling the reserved endpoints. Session/profile creation and profile delete/session revoke now have executor-based transaction composition helpers, while `anonymous-session-v1` table/index readiness is separate from the current `/readyz` `baseline-read-v1` contract.
- Anonymous runtime activation scaffolding is implemented without enabling the reserved endpoints. `UTOPLAN_ANONYMOUS_RUNTIME=1` can only pass the pure activation gate after anonymous schema readiness is confirmed and `UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE` is `shared` or `edge`; shared mode also requires trusted proxy client identity.
- Anonymous reserved endpoint rate-limit response scaffolding is implemented without enabling success behavior. Reserved anonymous routes can return `429 Too Many Requests` with `Retry-After`, no `RateLimit-*` headers, and no cookies before falling through to the existing `501` disabled-runtime response. `UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT` and `UTOPLAN_ANONYMOUS_RESERVED_RATE_LIMIT_WINDOW_MS` are deterministic reserved-route test knobs, not production limiter configuration.
- Anonymous endpoint handler composition scaffolding is implemented without mounting it in `server.ts`. `dtoapi/modern/src/anonymous_endpoint_handlers.ts` composes create/read/write/delete validation, same-origin and CSRF verification for mutating handlers, token/cookie helpers, injected rate-limit decisions, injected data access, row-version conflict handling, deleted-profile `410` handling, delete/revoke, and clear-cookie response descriptors for unit tests, while public HTTP endpoints remain reserved.
- `/readyz` remains operational readiness only; source metadata is intentionally kept out of readiness so provenance visibility does not depend on database health.
- `dtoapi/modern/test/response_contract_test.js` pins the typed response envelope.
- `dtoapi/modern/test/resource_contract_test.js` pins the typed resource/data-access boundary.
- `dtoapi/modern/test/records_contract_test.js` pins typed record payload wrapping without requiring a database.
- `dtoapi/modern/test/source_metadata_test.js` pins the source metadata transformation without requiring a database.
- `dtoapi/modern/test/planning_context_test.js` pins the demo planning context transformation without requiring a database.
- `dtoapi/modern/test/demo_session_test.js` pins the demo session query validation and row serialization without requiring a database.
- `dtoapi/modern/test/anonymous_profile_test.js` pins anonymous session/profile SQL and row/envelope mapping without requiring a database.
- `dtoapi/modern/test/anonymous_token_test.js` pins anonymous token hashing, CSRF verification, cookie parsing, and cookie construction without requiring a database.
- `dtoapi/modern/test/anonymous_rate_limit_test.js` pins anonymous rate-limit key generation and fixed-window decisions without enabling endpoint runtime behavior.
- `dtoapi/modern/test/anonymous_profile_validation_test.js` pins anonymous profile body-size, JSON parse, top-level envelope, row-version, and field validation without enabling endpoint runtime behavior.
- `dtoapi/modern/test/anonymous_security_test.js` pins anonymous route CORS and CSRF scaffolding without requiring a database or enabling endpoint runtime behavior.
- `dtoapi/modern/test/anonymous_endpoint_contract_test.js` pins endpoint-level reserved anonymous route contracts, including method allowlists, allowed/denied CORS behavior, same-origin Referer fallback, no cookie issuance, exact `501`/`403`/`405` response envelopes, and reserved-route `429` plus `Retry-After` behavior while runtime behavior remains disabled.
- `dtoapi/modern/test/anonymous_endpoint_handlers_test.js` pins pure anonymous create/read/write/delete handler composition without wiring success runtime into `server.ts`.
- `dtoapi/modern/test/schema_contract_test.js` pins the disabled-route baseline readiness contract and the separate enabled-runtime anonymous table/index readiness gate.
- `dtoapi/modern/test/anonymous_runtime_test.js` pins release-gated anonymous runtime activation without enabling endpoint behavior.
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

Implement anonymous route behavior behind the release activation gate only after the anonymous migration artifact is reviewed/applied, anonymous schema readiness is green, shared or edge production rate limiting is selected, and full success/failure endpoint tests cover ownership, stale writes, deletion, audit, and retention. Test migration to TypeScript is optional and lower priority than product behavior or CI hardening.
