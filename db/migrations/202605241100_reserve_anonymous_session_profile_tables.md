# 202605241100_reserve_anonymous_session_profile_tables

## Summary

Reserve additive tables for future anonymous session and caller-owned planning profile work:

- `anonymous_sessions`
- `anonymous_planning_profiles`
- `anonymous_profile_events`

This migration is a schema reservation only. It does not enable anonymous session endpoints, profile reads, profile writes, password login, account recovery, roles, or production user onboarding.

## Compatibility

- Application version before migration: modern API with browser-local profiles, local/demo DB sessions, and reserved account-backed session/profile tables
- Application version after migration: same runtime behavior, with reserved anonymous session/profile tables available for a later reviewed API pass
- Backward-compatible before deploy: yes
- Requires `baseline-read-v1` readiness update: no

These tables are additive and unused by the current API runtime. `/readyz` should continue reporting the same `baseline-read-v1` readiness contract until anonymous session/profile endpoints are implemented and explicitly require these tables.

## Preflight

```sh
npm run build
npm test
npm run docker:test:modern-db
npm run docker:test:proxy
```

Confirm the reserved table names are not already present:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = ANY(ARRAY[
  'anonymous_sessions',
  'anonymous_planning_profiles',
  'anonymous_profile_events'
])
ORDER BY table_name;
```

Expected result before apply: zero rows, unless a prior reviewed release already applied this reservation.

Confirm current production backup:

```text
Backup identifier: required before apply
Backup timestamp: required before apply
Restore procedure location: required before apply
```

## Apply

```sql
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id bigserial PRIMARY KEY,
  public_id varchar(64) NOT NULL,
  token_hash bytea NOT NULL,
  csrf_token_hash bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  revoke_reason varchar(64),
  CHECK (public_id ~ '^[a-z0-9][a-z0-9_-]{20,63}$'),
  CHECK (expires_at > created_at),
  CHECK (revoke_reason IS NULL OR revoke_reason ~ '^[a-z0-9_.-]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS anonymous_sessions_public_id_unique
ON anonymous_sessions (public_id);

CREATE UNIQUE INDEX IF NOT EXISTS anonymous_sessions_token_hash_unique
ON anonymous_sessions (token_hash);

CREATE INDEX IF NOT EXISTS anonymous_sessions_active_expiry_index
ON anonymous_sessions (expires_at)
WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS anonymous_planning_profiles (
  id bigserial PRIMARY KEY,
  anonymous_session_id bigint NOT NULL REFERENCES anonymous_sessions(id),
  schema_version integer NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  deletion_requested_at timestamptz,
  export_requested_at timestamptz,
  CHECK (schema_version = 1),
  CHECK (row_version > 0),
  CHECK (jsonb_typeof(profile) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS anonymous_planning_profiles_session_active_unique
ON anonymous_planning_profiles (anonymous_session_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS anonymous_planning_profiles_retention_index
ON anonymous_planning_profiles (deleted_at, updated_at);

CREATE TABLE IF NOT EXISTS anonymous_profile_events (
  id bigserial PRIMARY KEY,
  anonymous_session_id bigint REFERENCES anonymous_sessions(id),
  anonymous_profile_id bigint REFERENCES anonymous_planning_profiles(id),
  event_name varchar(96) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (event_name ~ '^[a-z0-9_.-]+$'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS anonymous_profile_events_session_created_index
ON anonymous_profile_events (anonymous_session_id, created_at);

CREATE INDEX IF NOT EXISTS anonymous_profile_events_profile_created_index
ON anonymous_profile_events (anonymous_profile_id, created_at);
```

Do not seed these tables with real or sample user data in production. Do not backfill them from `demo_sessions`, `user_accounts`, or source-backed planning tables.

## Verify

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = ANY(ARRAY[
  'anonymous_sessions',
  'anonymous_planning_profiles',
  'anonymous_profile_events'
])
ORDER BY table_name, ordinal_position;
```

Expected required indexes:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = ANY(ARRAY[
  'anonymous_sessions_public_id_unique',
  'anonymous_sessions_token_hash_unique',
  'anonymous_sessions_active_expiry_index',
  'anonymous_planning_profiles_session_active_unique',
  'anonymous_planning_profiles_retention_index',
  'anonymous_profile_events_session_created_index',
  'anonymous_profile_events_profile_created_index'
])
ORDER BY indexname;
```

Expected row counts before endpoint implementation:

```sql
SELECT 'anonymous_sessions' AS table_name, COUNT(*) FROM anonymous_sessions
UNION ALL
SELECT 'anonymous_planning_profiles' AS table_name, COUNT(*) FROM anonymous_planning_profiles
UNION ALL
SELECT 'anonymous_profile_events' AS table_name, COUNT(*) FROM anonymous_profile_events;
```

All counts should be zero until anonymous session/profile endpoints are intentionally enabled.

Application checks:

```sh
curl -fsS https://app.example.com/healthz
curl -fsS https://app.example.com/v1/unis
curl -fsS https://app.example.com/v1/planning/context-demo
```

API readiness:

```sh
curl -fsS https://api.example.internal/readyz
```

Expected API readiness remains versioned as `baseline-read-v1`.

## Rollback

### Pre-Activation Rollback

Only run this rollback before any anonymous session/profile endpoint has written data. First disable `UTOPLAN_ANONYMOUS_RUNTIME` or route traffic to an app/API release pair where anonymous runtime remains fail-closed.

Immediately before rollback, verify that all anonymous storage tables are empty:

```sql
SELECT 'anonymous_sessions' AS table_name, COUNT(*) FROM anonymous_sessions
UNION ALL
SELECT 'anonymous_planning_profiles' AS table_name, COUNT(*) FROM anonymous_planning_profiles
UNION ALL
SELECT 'anonymous_profile_events' AS table_name, COUNT(*) FROM anonymous_profile_events;
```

All counts must be zero. If they are zero, drop in foreign-key order:

```sql
DROP TABLE IF EXISTS anonymous_profile_events;
DROP TABLE IF EXISTS anonymous_planning_profiles;
DROP TABLE IF EXISTS anonymous_sessions;
```

### Post-Activation Rollback

If any of these tables contain production endpoint data, do not drop them directly. These rows may contain anonymous profile data, token hashes, CSRF token hashes, audit events, delete/export request markers, and retention-sensitive state.

Post-activation rollback must:

- disable `UTOPLAN_ANONYMOUS_RUNTIME` or route traffic to a compatible previous app/API release with anonymous runtime disabled
- preserve `anonymous_sessions`, `anonymous_planning_profiles`, and `anonymous_profile_events`
- keep retention, deletion, and future export obligations intact
- revoke or expire sessions only through a reviewed data-preserving fix
- create a reviewed follow-up migration if table shape must change

Backup restore can roll back unrelated production data and must not be the default fix once anonymous rows exist. Use restore only as part of an incident-reviewed database recovery plan with explicit data-loss acceptance.

Fallback application action:

```text
Keep the current browser-local profile and local/demo session release live. Do not enable anonymous session/profile endpoints.
```

## Post-Deploy

- Release notes updated: required if the reserved tables are applied
- Dashboard or logs checked: API `/readyz` must continue returning `200`
- Migration artifact linked from PR: required
- Anonymous session/profile endpoints enabled: no
- If applied as part of an anonymous-runtime candidate: verify the anonymous schema gate, shared/edge limiter attestation, trusted proxy evidence, and opt-in anonymous smoke before public activation
- Reservation-only release behavior: anonymous routes remain fail-closed unless the separate runtime activation gate is explicitly enabled
