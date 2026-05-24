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

The reservation artifact is `db/migrations/202605241000_reserve_session_profile_tables.md`. It is additive and must not enable endpoints by itself.

These tables are not active in the current API yet. `demo_sessions` must remain local/demo-only. In plain terms: demo_sessions must remain local/demo-only. It must not be promoted into production account storage.

## Reserved Endpoints

Reserved, not implemented:

- `POST /v1/session/login`
- `POST /v1/session/logout`
- `GET /v1/profile`
- `PUT /v1/profile`
- `DELETE /v1/profile`

All reserved production session/profile endpoints require HTTPS in deployment and an authenticated session design before they are exposed.

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
- Do not write user profile data to source-backed planning tables.

## Next Implementation Gate

The next safe implementation step is a reviewed API design for anonymous session bootstrap and caller-owned profile reads/writes. Any endpoint implementation should come after the reserved-table migration artifact passes review and should keep production auth disabled until the contract requirements are satisfied.
