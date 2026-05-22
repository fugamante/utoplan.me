# Database Migration Artifacts

This directory holds reviewed migration artifacts for production schema changes.

The project does not yet include an automatic migration runner. Migration files are operator-reviewed release artifacts that document how to apply, verify, and roll back a schema change outside application startup.

## Naming

Use a monotonic UTC timestamp and short action:

```text
YYYYMMDDHHMM_short_action.md
```

Example:

```text
202605210930_add_unis_region.md
```

## Required Sections

Every migration artifact must include these headings:

- `Summary`
- `Compatibility`
- `Preflight`
- `Apply`
- `Verify`
- `Rollback`
- `Post-Deploy`

## Rules

- Do not mutate schema from app or API startup.
- Prefer backward-compatible changes that can be deployed before application code depends on them.
- Include exact SQL or a link to the reviewed SQL source.
- Include a rollback plan even when rollback is "restore from backup and keep previous app artifact live".
- State whether `/readyz` schema expectations need to change.
- Run `npm run build` and Docker DB validation before applying production changes.
