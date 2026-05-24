# Database Migration Strategy

Production database changes are explicit release artifacts, not application startup behavior.

## Current Baseline

The modern API expects the `baseline-read-v1` read schema. API `/readyz` verifies that baseline before the API is marked ready.

The current baseline covers the public read tables and columns used by `dtoapi/modern/src/resource_contract.ts`, plus the additive `demo_sessions` table required by the DB-backed local demo session endpoint while that endpoint is active.

The initial baseline artifact is `db/migrations/202605211200_baseline_read_v1.md`.

The natural-key index artifact for future Puerto Rico loader upserts is `db/migrations/202605230900_add_load_natural_key_indexes.md`.

API `/readyz` reports those index prerequisites as advisory `loadPolicyIndexes` metadata. Missing load-policy indexes do not fail the current `baseline-read-v1` readiness gate.

The demo session artifact for local DB-backed sessions is `db/migrations/202605240900_add_demo_sessions.md`.

The reserved production session/profile table artifact is `db/migrations/202605241000_reserve_session_profile_tables.md`. It is additive and must not enable production auth endpoints by itself.

The reserved anonymous session/profile table artifact is `db/migrations/202605241100_reserve_anonymous_session_profile_tables.md`. It is additive, separate from account-backed tables, and must not enable anonymous profile endpoints by itself.

## Artifact Location

Store migration artifacts in `db/migrations/`.

Use `db/migrations/TEMPLATE.md` for new changes. Each artifact must describe:

- the exact schema or data change
- compatibility with the previous and next app/API versions
- preflight validation
- apply SQL
- read-only verification SQL
- rollback procedure
- post-deploy checks

## Release Policy

- Prefer expand-and-contract migrations.
- Deploy additive schema changes before application code requires them.
- Keep destructive or incompatible changes in a separate release after the old code path is retired.
- Never run schema mutation from `app`, `api`, `/readyz`, `/healthz`, or container startup.
- Update the `baseline-read-v1` readiness contract only when the modern API requires a new read table or column.
- Apply the natural-key indexes before enabling any writer that uses the Puerto Rico load policy upsert keys.

## Review Checklist

Before merge:

- Migration artifact exists under `db/migrations/`.
- SQL is reviewed independently from application code.
- Rollback is written and realistic for production data.
- `npm run build` passes.
- Docker DB validation passes when Docker is available.
- `/readyz` behavior is updated if required by the schema change.

Before production apply:

- Current database backup is identified and restore steps are known.
- Target application release pair is known.
- Operator has confirmed maintenance window or online-safe apply path.
- Post-apply `/readyz` and public app smoke checks are defined.
