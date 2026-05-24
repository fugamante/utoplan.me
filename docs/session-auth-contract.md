# Session And Authentication Contract

This contract defines the boundary that must be satisfied before utoplan.Me adds production user accounts or server-backed profile writes.

## Current State

The current branch intentionally supports only:

- browser-local planning profile storage in `localStorage`
- seeded local/demo sessions through `demo_sessions`

Neither path is production authentication. The demo endpoint must not be used as a public account system.

## Production Auth Status

Production authentication is blocked until the machine-readable contract in `data/mappings/puerto-rico-session-auth-contract.json` is satisfied.

Required decisions before implementation:

- account identifier policy
- password hashing algorithm and parameters
- session token generation, hashing, expiration, rotation, revocation, and cookie settings
- profile field classification and minimization
- retention, deletion, and export behavior
- rate limits for login, reset, session creation, and profile writes
- audit events that do not include secrets, raw tokens, passwords, or sensitive profile text
- migration artifacts and rollback plans for every new production table

## Reserved Data Model

The reserved production model is:

- `user_accounts` for account identity and password hash metadata
- `user_sessions` for hashed server-side session tokens
- `planning_profiles` for authenticated saved planning profile data
- `profile_events` for a minimal audit trail without storing full profile payloads

The anonymous profile model must use a separate migration and separate tables:

- `anonymous_sessions` for hashed anonymous session tokens
- `anonymous_planning_profiles` for caller-owned profile data with `row_version`
- `anonymous_profile_events` for anonymous lifecycle audit records

The reservation artifact is `db/migrations/202605241000_reserve_session_profile_tables.md`. It is additive and must not enable endpoints by itself.

The anonymous reservation artifact is `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md`. It is additive and must not enable endpoints by itself. The required runtime sequence is reserved in `docs/anonymous-session-runtime-sequence.md`.

Password account tables are not active in the current API yet. Anonymous tables are used only by the gate-mounted anonymous runtime when activation passes. `demo_sessions` must remain local/demo-only. In plain terms: demo_sessions must remain local/demo-only. It must not be promoted into production account storage.

## Reserved Endpoints

Gate-mounted anonymous endpoints:

- `POST /v1/anonymous-sessions`
- `GET /v1/profile`
- `PUT /v1/profile`
- `DELETE /v1/profile`

Reserved, not implemented:

- `POST /v1/session/login`
- `POST /v1/session/logout`

All production session/profile endpoints require HTTPS in deployment and an authenticated session design before they are exposed. Anonymous endpoints are mounted only behind the fail-closed release activation gate described in `docs/anonymous-session-runtime-sequence.md`.

## Anonymous Session/Profile API Contract

The first server-backed profile slice is reserved as anonymous session/profile behavior only. It does not include password login or account recovery.

Reserved anonymous flow:

1. `POST /v1/anonymous-sessions` creates an anonymous caller-owned session and an empty or supplied planning profile.
2. The response sets an `HttpOnly; Secure; SameSite=Lax` session cookie.
3. The server stores only a token hash.
4. `GET /v1/profile` returns only the profile owned by the anonymous session cookie.
5. `PUT /v1/profile` replaces only the caller-owned profile and requires a matching `rowVersion`.
6. `DELETE /v1/profile` soft-deletes the caller-owned profile and revokes the anonymous session.

The API contract reserves these response and failure rules:

- `POST /v1/anonymous-sessions` returns `201` on success.
- `POST /v1/anonymous-sessions` must issue a newly generated server token and must not trust attacker-supplied, expired, or revoked cookies.
- `POST /v1/anonymous-sessions` is protected by strict same-origin `Origin` or `Referer` validation and rate limits before a session exists. It returns a response-body `csrfToken` for later mutating requests; the server stores only its hash.
- `GET /v1/profile` and `PUT /v1/profile` return `200` on success.
- `DELETE /v1/profile` returns `204` on success.
- Missing, invalid, expired, or revoked session cookies return `401`.
- Failed same-origin, CORS, or CSRF checks return `403`.
- Stale profile `rowVersion` values return `409`.
- Deleted profiles return `410`.
- Oversized profile bodies return `413`.
- Invalid profile fields return `422`.
- Rate limits return `429`.

Allowed profile fields remain `businessIdea`, `selectedMunicipalityId`, and `selectedCategoryId`. The `businessIdea` field remains capped at 160 characters. Unknown profile fields are rejected, and request bodies are capped before parsing. `demo_sessions` and password-backed `user_accounts` must not be used for anonymous profile storage.

Cookie-backed profile routes must not inherit wildcard CORS behavior. Runtime implementation must use route-specific CORS handling for anonymous profile routes: no wildcard `Access-Control-Allow-Origin`, explicit Origin validation, `Vary: Origin` when an Origin is allowed, and denied preflights for disallowed Origins. Profile-mutating methods after bootstrap require same-origin `Origin` or `Referer` validation plus an `X-CSRF-Token` header bound to the resolved anonymous session.

Anonymous rate-limit rejections must return `429` without revealing whether a session or profile exists. Every `429` response must include `Retry-After` as delta seconds using the limiter reset time rounded up to seconds with a minimum value of `1`. The first anonymous runtime slice should not expose `RateLimit-Limit`, `RateLimit-Remaining`, or `RateLimit-Reset` headers unless a separate public client contract is accepted.

Profile writes must enforce caller ownership in the same atomic update as optimistic concurrency, using the anonymous session owner, expected `rowVersion`, and non-deleted profile predicate in one write statement.

This anonymous contract now has a separate anonymous storage migration artifact, runtime sequence document, route-specific CORS/CSRF scaffolding, token-hashing helpers, anonymous data-access scaffolding, process-local rate-limit scaffolding, profile body-validation helpers, endpoint-level reserved-route tests, transactional create/delete composition helpers, a separate enabled-runtime schema readiness gate, release-gated activation scaffolding with explicit edge/shared limiter attestations, reserved-route `429` response coverage, pure handler-composition scaffolding, and gated server mounting for anonymous create/read/write/delete. Runtime endpoints remain fail-closed until the artifact is reviewed/applied as part of a release and shared or edge production rate limits are configured. The existing `user_accounts` and `planning_profiles.account_id` reservation is for password-account work and must not be filled with dummy account rows for anonymous users.

## Privacy Rules

Allowed profile fields are intentionally small:

- `businessIdea`, maximum 160 characters
- `selectedMunicipalityId`
- `selectedCategoryId`

Production implementation must provide deletion and export behavior. Public seeds, docs, branches, commits, and PR text must avoid personal identifiers.

## Forbidden Actions

- Do not store plaintext passwords.
- Do not store raw session tokens.
- Do not expose profile JSON through wildcard CORS without an authenticated session design.
- Do not add production auth endpoints before migration artifacts, tests, and rollback plans exist.
- Do not reuse `demo_sessions` for production accounts.
- Do not fake `user_accounts` rows for anonymous sessions.
- Do not allow profile reads or writes without proving caller ownership through a server-validated session token.
- Do not overwrite profiles without `rowVersion` optimistic concurrency checks.
- Do not write user profile data to source-backed planning tables.

## Next Implementation Gate

The next safe implementation step is applying the anonymous storage and shared-limiter migration artifacts in a disposable environment, enabling shared anonymous runtime config, and running the opt-in anonymous release smoke against that candidate. Password auth remains disabled until the contract requirements are satisfied.
