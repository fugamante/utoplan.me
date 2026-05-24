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

CREATE TABLE IF NOT EXISTS anonymous_rate_limit_buckets (
  rate_limit_key text PRIMARY KEY,
  scope varchar(64) NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (rate_limit_key ~ '^anonymous:'),
  CHECK (scope ~ '^[a-z0-9_]+$'),
  CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS anonymous_rate_limit_buckets_reset_index
ON anonymous_rate_limit_buckets (reset_at);
