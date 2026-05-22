# Database Migration Strategy

Production database changes are explicit release artifacts, not application startup behavior.

## Current Baseline

The modern API expects the `baseline-read-v1` read schema. API `/readyz` verifies that baseline before the API is marked ready.

The current baseline covers the public read tables and columns used by `dtoapi/modern/src/resource_contract.ts`.

The initial baseline artifact is `db/migrations/202605211200_baseline_read_v1.md`.

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
