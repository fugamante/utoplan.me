# Anonymous Session Runtime Sequence

This document defines the implementation sequence and threat controls for gate-mounted `POST /v1/anonymous-sessions` and caller-owned `/v1/profile` routes.

## Status

- Contract status: reserved
- Runtime endpoint status: mounted behind release activation gate
- Required storage artifact: `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md`
- Password account dependency: none

## Threat Review

Primary risks:

- session fixation through attacker-supplied cookies
- cross-site profile mutation through cookie-backed requests
- wildcard CORS exposing profile JSON
- lost updates from concurrent profile writes
- profile disclosure across anonymous sessions
- retention failures after delete/export requests
- secret leakage through logs, audit events, or error responses

Required controls:

- generate a new high-entropy server token for every successful anonymous session creation
- store only token and CSRF token hashes
- set `HttpOnly; Secure; SameSite=Lax` session cookies
- validate same-origin `Origin` or `Referer` on mutating requests
- protect `POST /v1/anonymous-sessions` with strict same-origin validation and rate limits before a session exists
- return a one-time response `csrfToken` after anonymous session creation, store only its hash, and require `X-CSRF-Token` on later `PUT` and `DELETE` requests
- deny wildcard CORS for profile routes and return `Vary: Origin` for allowed Origins
- perform profile writes with caller ownership and `row_version` in the same atomic update
- log only event names, public ids, statuses, and bounded metadata

## Runtime Sequence

### `POST /v1/anonymous-sessions`

1. Reject disallowed Origins before reading or mutating profile data.
2. Apply the pre-auth rate limit keyed by client IP plus normalized Origin.
3. Enforce request body size before parsing.
4. Validate optional profile fields against the reserved profile schema.
5. Ignore expired, revoked, malformed, or attacker-supplied anonymous cookies.
6. If an active anonymous cookie exists, revoke that prior session with `session.anonymous.revoked`.
7. Generate a new session token and CSRF token with at least 128 bits of entropy.
8. Store only token and CSRF token hashes in `anonymous_sessions`.
9. Create one active `anonymous_planning_profiles` row with `schema_version = 1` and `row_version = 1`.
10. Write `session.anonymous.created` or `session.anonymous.rejected` without raw tokens or profile text.
11. Return `201` with public session/profile metadata, a response-body `csrfToken`, and the secure cookie.

### `GET /v1/profile`

1. Deny wildcard CORS and allow only explicit trusted Origins.
2. Apply the pre-auth rate limit keyed by client IP plus normalized Origin.
3. Hash the presented cookie token and resolve one active, unexpired anonymous session.
4. Apply the session rate limit keyed by anonymous session public id.
5. Return `401` for missing, invalid, expired, or revoked session cookies.
6. Read only the non-deleted profile owned by that anonymous session.
7. Return `404` when no profile exists and `410` when the profile is deleted.
8. Write `profile.read.succeeded` or `profile.read.rejected` without profile text.

### `PUT /v1/profile`

1. Validate Origin/Referer and `X-CSRF-Token` header presence before parsing or writing.
2. Apply the pre-auth failure rate limit for repeated Origin or CSRF-header failures.
3. Resolve the active anonymous session from the hashed cookie token.
4. Verify the `X-CSRF-Token` hash matches the resolved anonymous session before mutation.
5. Apply the session rate limit keyed by anonymous session public id.
6. Enforce request body size before parsing.
7. Validate the submitted `rowVersion` and profile fields.
8. Update atomically with caller ownership, expected `row_version`, and `deleted_at IS NULL`.
9. Return `409` for stale `rowVersion` and `404` for non-owned or missing active profiles.
10. Increment `row_version`, update `updated_at`, and return the new profile envelope.
11. Write `profile.write.succeeded` or `profile.write.rejected` without profile text.

### `DELETE /v1/profile`

1. Validate Origin/Referer and `X-CSRF-Token` header presence before writing.
2. Apply the pre-auth failure rate limit for repeated Origin or CSRF-header failures.
3. Resolve the active anonymous session from the hashed cookie token.
4. Verify the `X-CSRF-Token` hash matches the resolved anonymous session before mutation.
5. Apply the session rate limit keyed by anonymous session public id.
6. Write `profile.delete.requested` without profile text.
7. Soft-delete only the caller-owned active profile with `anonymous_session_id = caller_session_id AND deleted_at IS NULL`.
8. Return `410` when the caller-owned profile is already deleted.
9. Revoke the anonymous session in the same logical transaction.
10. Write `profile.delete.succeeded`, `profile.delete.rejected`, and `session.anonymous.revoked` as applicable.
11. Return `204` and clear the session cookie.

## Rate Limits

Initial runtime implementation must reserve these limit keys and apply them before any profile mutation. The current scaffold uses a process-local fixed-window helper for deterministic tests and reserved-route `429` contract coverage only: default limit `60`, default window `60000` ms, and stable non-secret keys. Public or multi-instance runtime must use shared storage or an edge/platform limiter before endpoint activation.

- anonymous session creation: client IP plus normalized Origin
- profile reads: anonymous session public id after authentication, with IP plus Origin fallback before authentication
- profile writes: anonymous session public id after authentication, with IP plus Origin fallback before authentication
- profile deletion: anonymous session public id after authentication, with IP plus Origin fallback before authentication
- repeated Origin failures: client IP plus normalized Origin plus failure type
- repeated CSRF failures: client IP plus normalized Origin plus failure type, then anonymous session public id when available
- repeated token failures: client IP plus normalized Origin plus failure type

Rejected requests should return `429` when the rate limit is exceeded and should not reveal whether a session or profile exists.

Origin normalization lowercases valid URL origins, maps missing Origin to `none`, and maps malformed Origin to `invalid`. Rate-limit keys must not include cookies, raw session tokens, CSRF tokens, request bodies, profile text, or profile field names.

### Production Rate-Limit Decision

Endpoint activation requires a shared or edge limiter selected in release configuration. Shared mode uses the Postgres-backed `anonymous_rate_limit_buckets` table; edge mode requires deployment-edge enforcement before requests reach the API. The process-local helper is unit-test-only and reserved-route scaffolding and must not protect public anonymous endpoints because it resets on restart, is per Node process, and cannot coordinate across containers or regions.

Choose `shared` when traffic reaches the private API only through the trusted app proxy or private deployment edge and all API instances coordinate through the same Postgres limiter table. Choose `edge` only when the deployment edge enforces the approved anonymous limiter scopes before requests can reach the API. Do not choose edge mode based only on `UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT=1`; the production-decision package must include platform policy evidence.

The production limiter must provide:

- atomic increment plus expiry for each fixed-window key
- consistent TTL/window behavior across all API instances
- a trusted clock source for reset calculations
- fail-closed behavior for mutating anonymous routes when the limiter is unavailable
- structured metrics for allowed, rejected, limiter-unavailable, and malformed-client-key outcomes
- exact per-scope limits approved in release notes before endpoint activation

The API may compute rate-limit keys only when it receives a trusted client IP signal from the private app proxy or deployment edge. Public boundaries must strip inbound forwarding headers and inject a single trusted client IP signal. Until that deployment behavior is configured and tested, anonymous runtime endpoints remain blocked.

The local disposable smoke stack validates this boundary through the static app proxy: `npm run docker:test:anonymous-runtime` exposes only the app on `18084`, keeps the trusted-proxy API and Postgres private inside the Compose network, strips attacker-supplied forwarding headers at the app layer, injects the socket-derived client IP for the private API hop, and runs anonymous rejection plus create/read/update/delete checks through the app origin.

Every `429` response must include `Retry-After` as delta seconds using `ceil((resetAtMs - nowMs) / 1000)` with a minimum value of `1`. The first public runtime slice will not expose `RateLimit-Limit`, `RateLimit-Remaining`, or `RateLimit-Reset`; add those headers only after a separate client-facing contract is accepted.

## Body Validation

Profile request bodies are capped at `2048` UTF-8 bytes before JSON parsing. Malformed JSON returns `400 invalid_request`; oversized bodies return `413 profile_too_large`; invalid profile shape returns `422 invalid_profile`.

Allowed profile data is object-only and may contain only:

- `businessIdea`: optional string, maximum 160 JavaScript string characters, no truncation
- `selectedMunicipalityId`: optional positive integer, no string coercion
- `selectedCategoryId`: optional string matching `^[a-z][a-z0-9_]{1,63}$`

`POST /v1/anonymous-sessions` accepts an optional top-level `profile` object and rejects unknown top-level fields. `PUT /v1/profile` requires a positive integer `rowVersion` and a valid top-level `profile` object.

## Retention And Export

- Default profile retention remains 365 days.
- Delete requests soft-delete profile rows and revoke the session immediately.
- Retention jobs must use `anonymous_planning_profiles_retention_index`.
- Export behavior is reserved; no export endpoint is implemented in this slice.
- A future export request must validate Origin/Referer, verify the session-bound CSRF token, write `profile.export.requested`, and read only caller-owned, non-deleted profiles.
- Export success writes `profile.export.succeeded`; rejected export attempts write `profile.export.rejected` without revealing whether a profile exists.
- Already-deleted profiles must not be exported and should use the same `410` deleted-state behavior as profile reads.
- Retention jobs should purge profiles only after the reviewed retention cutoff and write `profile.delete.retention_applied` with bounded metadata.
- Audit metadata must not include raw tokens, CSRF tokens, cookies, or full profile payloads.

## Implementation Gate

Runtime success behavior is mounted but must remain unreachable until:

- the anonymous session/profile and shared-limiter migration artifacts are reviewed and applied
- route-specific CORS, CSRF, token, body-validation, rate-limit response, and handler-composition scaffolding remain green
- shared production rate-limit storage or edge limiting is selected and explicitly attested in deployment configuration
- trusted client-IP boundary behavior is configured and tested
- release-gated runtime activation fails closed unless shared/edge rate limiting and anonymous schema readiness are configured
- focused endpoint tests cover success, ownership failure, CSRF failure, CORS failure, stale writes, delete/revoke, retention, and audit events

When the gate fails, the server must keep the reserved response contract and must not execute anonymous handler data access. Current gate checks require `UTOPLAN_ANONYMOUS_RUNTIME=1`, anonymous schema readiness, and `UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE=shared` or `edge`. Edge mode also requires `UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT=1`. Shared mode requires `UTOPLAN_TRUST_PROXY=1`, `UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT=1`, and the `anonymous_rate_limit_buckets` schema to be visible to the anonymous readiness check.

## Operator Rollback Notes

The activation gate is the primary rollback control. Disabling `UTOPLAN_ANONYMOUS_RUNTIME` must return anonymous routes to reserved/fail-closed behavior without executing handler data access.

Anonymous storage rollback for `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md` is allowed only before `anonymous_sessions`, `anonymous_planning_profiles`, and `anonymous_profile_events` contain production endpoint data. Once public writes exist, do not drop anonymous tables; preserve the rows, revoke or expire sessions only through a reviewed data-preserving fix, and keep retention/deletion/export obligations intact.

Shared limiter rollback for `db/migrations/202605241200_add_anonymous_rate_limit_buckets.md` is allowed only when shared limiter mode is disabled or traffic has moved to an approved edge-limited release. Dropping limiter buckets resets short-window counters and removes related observability.

Operational rollback order is:

1. Disable `UTOPLAN_ANONYMOUS_RUNTIME` or route traffic away from the affected app/API release pair.
2. Remove shared or edge limiter attestations only after runtime is disabled or a fixed release is active.
3. Run release smoke against the public app origin to confirm anonymous routes are disabled or protected by the fixed limiter mode.
4. Apply database rollback only when the migration artifact safety conditions are satisfied.
