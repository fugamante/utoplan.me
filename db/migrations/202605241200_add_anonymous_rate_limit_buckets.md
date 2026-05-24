# 202605241200_add_anonymous_rate_limit_buckets

## Summary

Add `anonymous_rate_limit_buckets` for the Postgres-backed anonymous shared rate limiter. This table stores fixed-window counters by the existing anonymous rate-limit key format so pre-auth, session, and failure limiter scopes can coordinate across API processes.

This migration does not enable anonymous runtime endpoints by itself.

## Compatibility

- Application version before migration: modern API with gate-mounted anonymous runtime and explicit edge/shared limiter activation contract
- Application version after migration: same endpoint behavior, with shared anonymous limiter storage available for reviewed runtime activation
- Backward-compatible before deploy: yes
- Requires `baseline-read-v1` readiness update: no

This table is additive. The anonymous runtime schema gate now expects it before shared anonymous runtime activation can pass.

## Preflight

```sh
npm run build
npm test
npm run docker:test:modern-db
npm run docker:test:proxy
```

Confirm the table name is not already present:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'anonymous_rate_limit_buckets';
```

Expected result before apply: zero rows, unless a prior reviewed release already applied this migration.

Confirm current production backup:

```text
Backup identifier: required before apply
Backup timestamp: required before apply
Restore procedure location: required before apply
```

## Apply

```sql
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
```

Do not seed this table. It is runtime-owned counter state.

## Verify

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'anonymous_rate_limit_buckets'
ORDER BY table_name, ordinal_position;
```

Expected indexes:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = ANY(ARRAY[
  'anonymous_rate_limit_buckets_pkey',
  'anonymous_rate_limit_buckets_reset_index'
])
ORDER BY indexname;
```

Expected row count before anonymous runtime traffic:

```sql
SELECT COUNT(*) FROM anonymous_rate_limit_buckets;
```

The count should be zero before anonymous runtime traffic uses the shared limiter.

## Rollback

```sql
DROP TABLE IF EXISTS anonymous_rate_limit_buckets;
```

Fallback application action:

```text
Disable `UTOPLAN_ANONYMOUS_RUNTIME` or use an edge-enforced limiter release pair.
```

## Post-Deploy

- Release notes updated:
- Dashboard or logs checked:
- Migration artifact linked from PR:
