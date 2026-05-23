# 202605230900_add_load_natural_key_indexes

## Summary

Add unique indexes for the natural keys required by the Puerto Rico load policy:

- `cbps(county, cnaic)`
- `muns(county)`
- `unis(title, address)`

The dry-run SQL preview uses PostgreSQL `INSERT ... ON CONFLICT` against these key sets. PostgreSQL requires each conflict target to match a unique index or constraint before the preview can become a real writer.

## Compatibility

- Application version before migration: modern API with read-only `baseline-read-v1` readiness checks
- Application version after migration: modern API plus future Puerto Rico data loader readiness
- Backward-compatible before deploy: yes
- Requires `baseline-read-v1` readiness update: no

These indexes are additive. Existing read endpoints continue to use the same tables and columns, and `/readyz` does not need to validate these indexes until a write-capable loader becomes part of the runtime contract.

## Preflight

```sh
npm run build
npm run docker:test:db
npm run docker:test:data-sql-preview
npm run docker:test:proxy
npm run docker:test:start-local-browser
```

Check for duplicate natural keys before applying the indexes:

```sql
SELECT county, cnaic, COUNT(*) AS duplicate_count
FROM cbps
GROUP BY county, cnaic
HAVING COUNT(*) > 1;

SELECT county, COUNT(*) AS duplicate_count
FROM muns
GROUP BY county
HAVING COUNT(*) > 1;

SELECT title, address, COUNT(*) AS duplicate_count
FROM unis
GROUP BY title, address
HAVING COUNT(*) > 1;
```

All three duplicate checks must return zero rows. If duplicates exist, stop and create a separate reviewed data-cleanup artifact before applying this migration.

Check for incomplete natural keys:

```sql
SELECT COUNT(*) AS incomplete_key_count
FROM cbps
WHERE county IS NULL OR cnaic IS NULL;

SELECT COUNT(*) AS incomplete_key_count
FROM muns
WHERE county IS NULL;

SELECT COUNT(*) AS incomplete_key_count
FROM unis
WHERE title IS NULL OR address IS NULL OR title = '' OR address = '';
```

All three incomplete-key checks should return zero before a writer is enabled. If production history contains incomplete keys, this index migration may still be applied, but the writer must remain disabled until a reviewed data-cleanup artifact resolves those rows or the load policy changes.

Confirm current production backup:

```text
Backup identifier: required before apply
Backup timestamp: required before apply
Restore procedure location: required before apply
```

## Apply

For a production database that supports online index builds, prefer:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS cbps_county_cnaic_unique
ON cbps (county, cnaic);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS muns_county_unique
ON muns (county);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unis_title_address_unique
ON unis (title, address);
```

Do not wrap `CREATE INDEX CONCURRENTLY` in an explicit transaction block.

For disposable local test databases only, non-concurrent creation is acceptable:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS cbps_county_cnaic_unique
ON cbps (county, cnaic);

CREATE UNIQUE INDEX IF NOT EXISTS muns_county_unique
ON muns (county);

CREATE UNIQUE INDEX IF NOT EXISTS unis_title_address_unique
ON unis (title, address);
```

## Verify

Read-only index verification:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = ANY(ARRAY['cbps', 'muns', 'unis'])
AND indexname = ANY(ARRAY[
  'cbps_county_cnaic_unique',
  'muns_county_unique',
  'unis_title_address_unique'
])
ORDER BY indexname;
```

Expected indexes:

```text
cbps_county_cnaic_unique: unique index on cbps(county, cnaic)
muns_county_unique: unique index on muns(county)
unis_title_address_unique: unique index on unis(title, address)
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

Expected API readiness remains `baseline-read-v1`.

## Rollback

For production databases:

```sql
DROP INDEX CONCURRENTLY IF EXISTS cbps_county_cnaic_unique;
DROP INDEX CONCURRENTLY IF EXISTS muns_county_unique;
DROP INDEX CONCURRENTLY IF EXISTS unis_title_address_unique;
```

Do not wrap `DROP INDEX CONCURRENTLY` in an explicit transaction block.

For disposable local test databases only:

```sql
DROP INDEX IF EXISTS cbps_county_cnaic_unique;
DROP INDEX IF EXISTS muns_county_unique;
DROP INDEX IF EXISTS unis_title_address_unique;
```

Fallback application action:

```text
Keep the current read-only app/API release live. Do not enable a write-capable data loader until the indexes are successfully applied and verified.
```

## Post-Deploy

- Release notes updated: required when the data loader migration bundle is prepared
- Dashboard or logs checked: API `/readyz` must continue returning `200`
- Migration artifact linked from PR: required
