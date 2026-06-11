# Puerto Rico Data Intake

This project should treat Puerto Rico as the only active data scope until the original hackathon dataset is recovered or a broader scope is explicitly approved.

## Intake Contract

Accepted source records must be listed in `data/sources/puerto-rico.json` before import work starts.

Each accepted source must record:

- Puerto Rico-only scope, or an explicit Puerto Rico filter such as Census `state:72`.
- Publisher, portal, license, source URL, and resource URL or API URL.
- Target legacy table or endpoint.
- Candidate status and a short source-basis note.
- Retrieval date at the registry level as an ISO `YYYY-MM-DD` string.
- Legacy-schema mapping evidence for active target tables where mapping
  evidence exists.
- Import-readiness status and explicit blockers for active mapped tables when
  source gaps, transform decisions, or operator dependencies still prevent a
  production-style import.

Do not import broad national datasets unless the registry entry includes a deterministic Puerto Rico filter and the import script enforces that filter.

## Legacy Schema Mapping Gate

Before writing import scripts, map candidate source fields to preserved legacy
read-schema columns in `dtoapi/modern/src/resource_contract.ts`.

Current mapping evidence is documented in
`docs/data-source-schema-mapping.md` and reflected in
`data/sources/puerto-rico.json` under `legacySchemaMap` for `cbps` and `unis`
candidates.

Keep every preserved legacy column explicit in the registry coverage for active
mapped tables. Mark unresolved or transform-backed columns as `missing` or
`derived`, include notes for every non-exact mapping, and do not promote a
source to production import on demo fixtures or seed rows.

When an active mapped-table candidate is not safe to import yet, record that
state under `importReadiness` with a `blocked` status and one blocker entry per
unresolved transform decision, source gap, or operator dependency.
Record `legacySchemaMap.evidenceDate` and `importReadiness.reviewedAt` as ISO
`YYYY-MM-DD` strings so provenance reviews stay machine-checkable.

When preserved coordinates are derived through an approved external geocoder,
record the pinned provider, request path, benchmark/vintage pair, address
construction rule, review rule, and checked-in cache artifact path under a
machine-readable `geocodingPolicy`. For the active `unis` candidate, that
policy must point at `docs/unis-geocoding-policy.md` and
`data/geocoding/unis-census-geocoder-cache.json`.

When a geocoded source is not yet fully importable, record a checked-in
quarantine artifact for excluded rows. The active `unis` candidate must keep
unmatched, out-of-scope, and unreviewed rows in
`data/geocoding/unis-import-quarantine.json` and must not report
`importReadiness.status: ready` until the approved cache contains reviewed
Puerto Rico matches and the quarantine artifact records the remaining excluded
rows.

When a preserved legacy column is absent from the primary source but approved
for import through a deterministic auxiliary join, record that rule under
`legacySchemaMap.columnStrategies`. Each strategy must identify the
`legacyColumn`, approval `status`, strategy `kind`, auxiliary `sourceId`,
resolved source field, join key, local checked-in artifact path, and notes. For
active `cbps.cnaic_name` coverage, the strategy must use a source-backed Census
title reference, point at `data/naics/cbp-naics-titles.json`, and must not
treat `data/naics/planning-context-naics-titles.json` as production import
evidence.

## Business Category Mapping Gate

Before building category-specific planning context, map user-facing business
categories to NAICS codes in
`data/mappings/puerto-rico-business-categories.json`.

The mapping is a selection aid only. It may filter CBP facts by relevant NAICS
codes, but it must not produce scores, rankings, recommendations, demand
claims, profitability claims, or municipality suitability conclusions.

Validate the category contract with:

```sh
npm run test:business-categories
```

## Planning Context Fixture Gate

Planning-context fixtures live under `data/planning-context/`.

The fixture must stay descriptive and include:

- one municipality reference;
- a municipality display name that matches `data/municipalities/planning-context-municipalities.json` when the fixture is exposed through the planning-context API/UI;
- one business category from the crosswalk;
- matching CBP facts selected by NAICS code and municipality code;
- deterministic `naicsTitle` labels for exposed CBP facts, resolved from `data/naics/planning-context-naics-titles.json` when the source row does not carry title text;
- source metadata, confidence labels, limitations, and unresolved questions.

The fixture set should include at least two municipality/category slices so
confidence and unresolved-question patterns can be compared before API/UI
exposure.

The fixture must not include scoring, ranking, recommendation, demand, or
profitability conclusions.

Validate the fixture contract with:

```sh
npm run test:planning-context
```

## Current Candidate Sources

- `cbps`: Datos.PR County Business Patterns 2014 Puerto Rico CSV and municipality CSV.
- `muns`: Datos.PR official Puerto Rico municipality boundary ZIP, plus the municipality-level CBP file where only tabular join data is needed.
- `unis`: Datos.PR higher education directory for Puerto Rico, academic year 2017-18.
- `cbps` fallback: Census 2014 CBP API filtered with `state:72`; current live
  access requires an API key, so this remains an operator-blocked fallback.

## Unresolved Legacy Tables

The legacy `cdepts`, `businesses`, and `grade_cs` tables still need source identification. They should remain blocked for production-style import until a Puerto Rico-only source, license, and transform path are recorded.

## Source Registry Validation

Run the registry contract check with:

```sh
npm run test:data-sources
npm run test:naics-registry
npm run test:unis-geocode-audit
```

The root `npm run test` command also runs all three checks.
