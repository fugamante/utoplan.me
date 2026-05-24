# 202605240900_add_demo_sessions

## Summary

Add a `demo_sessions` table for DB-backed local demo sessions. The table stores a neutral public session id, display label, selected municipality/category, and a JSON profile payload used by the demo session endpoint.

This is a demo foundation only. It does not add production authentication, authorization, password storage, or personal account management.

## Compatibility

- Application version before migration: modern API with live planning context reads.
- Application version after migration: modern API plus read-only seeded demo session endpoint.
- Backward-compatible before deploy: yes.
- Requires `baseline-read-v1` readiness update: yes.

The table is additive. Existing public resource routes and `/readyz` keep the same baseline read contract.

## Preflight

```sh
npm run build
npm run docker:test:db
```

Check whether the demo table already exists:

```sql
SELECT to_regclass('public.demo_sessions') AS demo_sessions_table;
```

If the table exists, inspect existing rows before applying any seed data:

```sql
SELECT public_id, display_name, municipality_id, category_id
FROM demo_sessions
ORDER BY id;
```

## Apply

```sql
CREATE TABLE IF NOT EXISTS demo_sessions (
  id serial PRIMARY KEY,
  public_id varchar(64) NOT NULL,
  display_name varchar(255) NOT NULL,
  municipality_id integer NOT NULL REFERENCES muns(id),
  category_id varchar(64) NOT NULL,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CHECK (public_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CHECK (category_id ~ '^[a-z0-9]+(_[a-z0-9]+){0,2}$'),
  CHECK (jsonb_typeof(profile) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS demo_sessions_public_id_unique
ON demo_sessions (public_id);
```

Disposable local/demo seed:

```sql
INSERT INTO demo_sessions (
  public_id,
  display_name,
  municipality_id,
  category_id,
  profile,
  created_at,
  updated_at
) VALUES (
  'demo-session-1',
  'Demo planner',
  1,
  'professional_services',
  '{
    "businessIdea": "Accounting and back-office services",
    "planningStage": "explore",
    "savedBy": "local-demo",
    "notes": "Non-production seeded profile for validating DB-backed demo sessions."
  }'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (public_id) DO NOTHING;
```

## Verify

```sql
SELECT public_id, display_name, municipality_id, category_id
FROM demo_sessions
WHERE public_id = 'demo-session-1';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'demo_sessions'
ORDER BY indexname;
```

Application checks:

```sh
curl -fsS http://127.0.0.1:3001/v1/demo/session?session=demo-session-1
curl -fsS http://127.0.0.1:3001/v1/planning/context?municipality=1\\&category=professional_services
```

Expected API readiness remains versioned as `baseline-read-v1`, with `demo_sessions` included in the required read-schema check while the endpoint is active.

## Rollback

For a disposable local demo database:

```sql
DROP TABLE IF EXISTS demo_sessions;
```

For any shared or production-like database, first preserve any rows that operators intentionally created:

```sql
SELECT *
FROM demo_sessions
ORDER BY id;
```

Then remove the endpoint from the application release before dropping the table.

## Post-Deploy

- Release notes updated: required when the demo session endpoint is promoted beyond local/demo use.
- Dashboard or logs checked: API `/readyz` must continue returning `200`.
- Migration artifact linked from PR: required.
