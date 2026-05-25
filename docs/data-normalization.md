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

The planner can read supported cached sources directly:

```sh
npm run plan:data -- --cache-dir=.cache/utoplan-data --out=report.json
```

Supported cached planner inputs:

- `datospr-cbp-2014-municipios`
- `datospr-official-municipality-boundaries` when cache metadata points to an extracted CSV or JSON attribute table with `municipio`, `countyfp`, and/or `cntyidfp`
- `datospr-higher-ed-directory-2017-18`
- `nces-edge-postsecondary-locations-2021-pr`

The raw official municipality boundary ZIP is intentionally not consumed by the planner yet. Operators must extract the non-geometry attribute table before dry-run planning, and the planner still imports only `muns.title` and `muns.county`.

When a cached source is present but unsupported, the planner includes `unsupportedCacheSources` in the report instead of guessing how to handle it.

## Load Boundary

`scripts/data_load_plan.js` converts an accepted planning report into DB-ready row groups without connecting to a database or executing SQL. It adds one import timestamp to `created_at` and `updated_at`, carries rejected/manual-review records into `skipped`, and keeps unsupported cached source IDs visible.

Each accepted load-plan row also carries a `provenance` object from `data/mappings/puerto-rico-provenance-confidence.json`. This sidecar records `sourceId`, `rowIndex`, source confidence, transform confidence, production readiness, and whether the row is source-backed. The provenance object is evidence for operators and future API/UI work; it is not inserted into the legacy read tables.

The modern API exposes that same contract at `GET /v1/source-metadata` as read-only metadata. This endpoint is for product and operator visibility; it does not mark the service ready, query the database, or promote candidate rows beyond their recorded confidence state.

Run:

```sh
npm run plan:data-load -- --plan=report.json --out=load-plan.json
```

This is still a dry-run boundary. A future database loader must consume this load plan and remain responsible for transaction handling, idempotency, and operator approval.

## Load Policy

The future database writer must follow `data/mappings/puerto-rico-load-policy.json`.

Current policy:

- writer status is `not-implemented`;
- one transaction must cover the full load plan;
- writes must be upserts by table-specific natural keys;
- rejected, manual-review, and unsupported cached-source records must never be written;
- production tables must not be truncated by the loader;
- non-empty skipped records require explicit operator approval before any write.

Run:

```sh
npm run test:data-load-policy
```

## SQL Preview

`scripts/data_sql_preview.js` converts the dry-run load plan into parameterized PostgreSQL upsert statements without connecting to a database or executing SQL. It quotes identifiers, uses the natural keys and update columns from `data/mappings/puerto-rico-load-policy.json`, and reports blocked reasons when skipped records still need operator acknowledgement.

Run:

```sh
npm run preview:data-sql -- --load-plan=load-plan.json --out=sql-preview.json
npm run test:data-sql-preview
```

The preview output remains `dryRunOnly: true` and `mutationAllowed: false`; it is an inspection artifact, not a writer.

SQL preview statements preserve the row provenance sidecar beside each generated statement. This keeps confidence and source evidence attached to dry-run SQL without changing SQL columns or enabling mutation.

## SQL Preview Database Check

The Docker-only database check applies the SQL preview against the disposable seeded Postgres schema inside one transaction, verifies each upsert affects one row, verifies expected in-transaction row counts, rolls back, and verifies final row counts match the starting state.

Run:

```sh
npm run docker:test:data-sql-preview
```

This check depends on unique indexes for the load-policy natural keys: `cbps(county, cnaic)`, `muns(county)`, and `unis(title, address)`.

## Writer Gate

`scripts/data_writer_gate.js` is an enablement preflight, not a writer. It consumes a SQL preview plus a captured API `/readyz` JSON payload and exits nonzero unless:

- skipped records are explicitly acknowledged;
- the SQL preview is unblocked and still dry-run only;
- the load policy writer status remains `not-implemented`;
- API readiness is healthy;
- `/readyz` reports `loadPolicyIndexes: "ok"`.

Run:

```sh
npm run gate:data-writer -- --sql-preview=sql-preview.json --readyz=readyz.json --acknowledge-skipped --out=writer-gate.json
npm run test:data-writer-gate
```

The gate output always keeps `writerEnabled: false`; it only records whether the prerequisite state would allow a future writer to be implemented safely.

## Writer Execution Contract

`data/mappings/puerto-rico-writer-contract.json` defines the audited execution contract a future writer must satisfy before mutation can be implemented. The contract is still `draft-no-writer` with `mutationStatus: "disabled"`.

It requires:

- load plan, SQL preview, writer gate, and operator approval artifacts;
- preflight, transaction, and post-commit phases;
- audit events for preflight, transaction open, each statement, rollback, commit, and post-commit verification;
- rollback on any failure;
- no writes outside the reviewed SQL preview.

Run:

```sh
npm run test:data-writer-contract
```

## Operator Approval Contract

`data/mappings/puerto-rico-operator-approval-contract.json` defines the approval artifact shape required before skipped records can be treated as acknowledged by a future writer.

It requires:

- neutral operator role or team name instead of personal identifiers;
- approval timestamp and reason;
- `skippedAcknowledged: true`;
- skipped counts copied from `sqlPreview.summary.skipped`;
- source artifact references for the load plan, SQL preview, and writer gate;
- no secrets, tokens, private keys, personal email, or real approval records committed to the public repo.

Run:

```sh
npm run test:data-operator-approval-contract
```

## Operator Approval Validation

`scripts/data_operator_approval_validate.js` validates a release approval artifact against the operator approval contract, SQL preview, and writer gate output. It exits nonzero when approval evidence is incomplete, skipped counts do not match the SQL preview, required acknowledgements are missing, the writer gate does not allow enablement, or forbidden fields such as tokens/secrets are present.

Run:

```sh
npm run validate:operator-approval -- --approval=approval.json --sql-preview=sql-preview.json --writer-gate=writer-gate.json --out=approval-validation.json
npm run test:data-operator-approval-validate
```

The validation result keeps `mutationAllowed: false`; it only checks release evidence.

## Release Evidence Bundle

`scripts/data_release_evidence_bundle.js` builds a local dry-run evidence directory from fixture planning input and a captured API `/readyz` payload. It writes:

- `planning-report.json`
- `load-plan.json`
- `sql-preview.json`
- `writer-gate.json`
- `operator-approval.json`
- `operator-approval-validation.json`
- `manifest.json`

Run:

```sh
npm run bundle:release-evidence -- --readyz=readyz.json --out-dir=release-evidence --acknowledge-skipped
npm run test:data-release-evidence-bundle
```

The bundle command does not connect to a database, execute SQL, or enable mutation. It writes `manifest.status: "blocked"` when the writer gate or approval validation is not satisfied.
