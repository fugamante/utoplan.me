# YYYYMMDDHHMM_short_action

## Summary

Describe the production schema or data change and the reason for it.

## Compatibility

- Application version before migration:
- Application version after migration:
- Backward-compatible before deploy: yes/no
- Requires `baseline-read-v1` readiness update: yes/no

## Preflight

```sh
npm run build
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
```

Confirm current production backup:

```text
Backup identifier:
Backup timestamp:
Restore procedure location:
```

## Apply

```sql
-- Reviewed production SQL goes here.
```

## Verify

```sql
-- Read-only verification SQL goes here.
```

Application checks:

```sh
curl -fsS https://app.example.com/healthz
curl -fsS https://app.example.com/v1/unis
```

API readiness:

```sh
curl -fsS https://api.example.internal/readyz
```

## Rollback

```sql
-- Reviewed rollback SQL goes here, or state why database restore is required.
```

Fallback application action:

```text
Route traffic to previous app/API release pair:
```

## Post-Deploy

- Release notes updated:
- Dashboard or logs checked:
- Migration artifact linked from PR:
