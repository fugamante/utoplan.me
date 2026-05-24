# 202605241000_reserve_session_profile_tables

## Summary

Reserve additive production tables for future authenticated session and server-saved planning profile work:

- `user_accounts`
- `user_sessions`
- `planning_profiles`
- `profile_events`

This migration is a schema reservation only. It does not enable authentication endpoints, profile writes, password login, account recovery, roles, or production user onboarding.

## Compatibility

- Application version before migration: modern API with browser-local profiles and local/demo DB sessions
- Application version after migration: same runtime behavior, with reserved production session/profile tables available for a later reviewed API pass
- Backward-compatible before deploy: yes
- Requires `baseline-read-v1` readiness update: no

These tables are additive and unused by the current API runtime. `/readyz` should continue reporting the same `baseline-read-v1` readiness contract until production session/profile endpoints are implemented and explicitly require these tables.

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
  'user_accounts',
  'user_sessions',
  'planning_profiles',
  'profile_events'
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
CREATE TABLE IF NOT EXISTS user_accounts (
  id bigserial PRIMARY KEY,
  public_id varchar(64) NOT NULL,
  login_identifier_hash bytea NOT NULL,
  password_hash text NOT NULL,
  password_algorithm varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  disabled_at timestamptz,
  CHECK (public_id ~ '^[a-z0-9][a-z0-9_-]{20,63}$'),
  CHECK (password_algorithm <> ''),
  CHECK (password_hash <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_public_id_unique
ON user_accounts (public_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_login_identifier_hash_unique
ON user_accounts (login_identifier_hash);

CREATE TABLE IF NOT EXISTS user_sessions (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES user_accounts(id),
  public_id varchar(64) NOT NULL,
  token_hash bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  CHECK (public_id ~ '^[a-z0-9][a-z0-9_-]{20,63}$'),
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_public_id_unique
ON user_sessions (public_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_hash_unique
ON user_sessions (token_hash);

CREATE INDEX IF NOT EXISTS user_sessions_account_id_index
ON user_sessions (account_id);

CREATE TABLE IF NOT EXISTS planning_profiles (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES user_accounts(id),
  schema_version integer NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  CHECK (schema_version = 1),
  CHECK (row_version > 0),
  CHECK (jsonb_typeof(profile) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS planning_profiles_account_active_unique
ON planning_profiles (account_id)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS profile_events (
  id bigserial PRIMARY KEY,
  account_id bigint REFERENCES user_accounts(id),
  profile_id bigint REFERENCES planning_profiles(id),
  event_name varchar(96) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (event_name ~ '^[a-z0-9_.-]+$'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS profile_events_account_created_index
ON profile_events (account_id, created_at);

CREATE INDEX IF NOT EXISTS profile_events_profile_created_index
ON profile_events (profile_id, created_at);
```

Do not seed these tables with real or sample user data in production.

## Verify

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = ANY(ARRAY[
  'user_accounts',
  'user_sessions',
  'planning_profiles',
  'profile_events'
])
ORDER BY table_name, ordinal_position;
```

Expected required indexes:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = ANY(ARRAY[
  'user_accounts_public_id_unique',
  'user_accounts_login_identifier_hash_unique',
  'user_sessions_public_id_unique',
  'user_sessions_token_hash_unique',
  'user_sessions_account_id_index',
  'planning_profiles_account_active_unique',
  'profile_events_account_created_index',
  'profile_events_profile_created_index'
])
ORDER BY indexname;
```

Expected row counts before endpoint implementation:

```sql
SELECT 'user_accounts' AS table_name, COUNT(*) FROM user_accounts
UNION ALL
SELECT 'user_sessions' AS table_name, COUNT(*) FROM user_sessions
UNION ALL
SELECT 'planning_profiles' AS table_name, COUNT(*) FROM planning_profiles
UNION ALL
SELECT 'profile_events' AS table_name, COUNT(*) FROM profile_events;
```

All counts should be zero until production auth/profile endpoints are intentionally enabled.

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

Only run this rollback before any production auth/profile endpoint has written data.

```sql
DROP TABLE IF EXISTS profile_events;
DROP TABLE IF EXISTS planning_profiles;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_accounts;
```

If any of these tables contain production user data, do not drop them directly. Restore from backup or create a reviewed data-preserving rollback plan.

Fallback application action:

```text
Keep the current browser-local profile and local/demo session release live. Do not enable production auth endpoints.
```

## Post-Deploy

- Release notes updated: required if the reserved tables are applied
- Dashboard or logs checked: API `/readyz` must continue returning `200`
- Migration artifact linked from PR: required
- Production auth endpoints enabled: no
