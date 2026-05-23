# Puerto Rico Data Normalization

This note defines the deterministic normalization rules that future import scripts must follow. The machine-readable contract lives in `data/mappings/puerto-rico-normalization.json`.

## Ready Rules

- `cbps.cnaic`: accept numeric NAICS values only, then convert to integer. Aggregate placeholders such as `------` and `23----` remain rejected until the schema supports string NAICS codes.
- `cbps.county`: prefer `fipscty`, fall back to `cencty`, then convert to integer.
- `muns.county`: prefer official boundary `countyfp`; fall back to `cntyidfp` after removing a leading `72` state prefix when needed; reconcile CBP rows through `fipscty` / `cencty`.
- `muns.title`: read `municipio`, trim it, collapse whitespace, and reject blank titles.
- timestamps: use one import-run timestamp for both `created_at` and `updated_at`.

## Needs Review

The `unis` coordinate join is specified but not ready for unattended import. It requires exact normalized institution name and municipality/city matches between the Datos.PR higher education directory and NCES EDGE postsecondary locations. Address token overlap can only break ties.

Ambiguous or unmatched university rows must be written to a manual review artifact instead of receiving guessed coordinates.

## Validation

Run:

```sh
npm run test:data-normalization
```

The root `npm run test` command also runs this check.

## Helper Module

Fixture-backed helper functions live in `scripts/data_normalization.js`. They do not fetch external data or write imports; they only implement the deterministic rules above so importer work can reuse tested behavior.

## Offline Planning

`scripts/data_import_plan.js` applies the helper functions to in-memory fixture rows and returns accepted, rejected, and manual-review buckets. It does not fetch source data, write files, or mutate a database.

Run:

```sh
npm run plan:data -- --fixtures=fixtures.json --out=report.json
npm run plan:data -- --cbps-csv=cbps.csv --muns-csv=muns.csv --unis-csv=unis.csv --unis-coordinates-csv=unis-coordinates.csv --out=report.json
npm run test:data-plan
```

The fixture JSON shape is:

```json
{
  "cbps": [],
  "muns": [],
  "unis": [],
  "unisCoordinates": []
}
```

Checked-in non-production examples live under `data/fixtures/non-production/`:

- `import-plan-fixtures.json`
- `import-plan-report.json`
- `cbps.csv`
- `muns.csv`
- `unis.csv`
- `unis-coordinates.csv`

## Local Source Cache

Registered sources can be downloaded into an ignored local cache for manual planning work:

```sh
npm run cache:data -- --source=datospr-cbp-2014-municipios
npm run cache:data -- --all
```

The cache command only downloads sources listed in `data/sources/puerto-rico.json`, requires HTTPS URLs, writes under `.cache/utoplan-data/`, and writes a sidecar metadata JSON file for each cached source. Downloaded source data is intentionally ignored by git.
