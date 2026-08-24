# Puerto Rico Data Intake

This project should treat Puerto Rico as the only active data scope until the original hackathon dataset is recovered or a broader scope is explicitly approved.

## Intake Contract

Accepted source records must be listed in `data/sources/puerto-rico.json` before import work starts.

Each accepted source must record:

- Puerto Rico-only scope, or an explicit deterministic Puerto Rico filter such
  as Census `state:72`, NCES `state:PR`, or a federal search surface using
  `state:Puerto Rico`.
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

For operator-reviewed registry entries, keep the exact filter expression in
`scopeFilter` so later refresh work can reproduce the Puerto Rico slice without
guessing which national rows were in scope.

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

When a geocoded source has a partial reviewed cache, record a checked-in import
boundary review before any production-style import output is accepted. The
active `unis` candidate keeps that review in
`data/geocoding/unis-import-boundary-review.json`. The current accepted
boundary permits only the reviewed Census-cache-backed subset and requires
API/UI coverage language until full coverage is reviewed.

The operational partial `unis` slice is generated with:

```sh
node scripts/build_unis_slice.js
```

That command reads the accepted boundary, cache, and quarantine artifacts, then
writes `data/generated/unis-partial-import.json` and
`docker/postgres/002_unis_partial_seed.sql`. The generated output may include
only cache-backed rows and must leave quarantined rows out. The generator also
reads `data/unis/partial-source-fields.json` to populate legacy detail fields
such as `desc` for the included rows only; that artifact must exactly match the
accepted cache-backed boundary and must not store principal-executive names or
contact fields.

Corrected-address verification for the approved rows that remain geocoder-
quarantined is generated with:

```sh
npm run verify:unis-addresses
```

That command writes `data/geocoding/unis-address-verification.json`. It is a
verification artifact, not an import artifact: rows remain excluded unless the
reviewed public-address evidence and pinned Census result are explicitly
accepted into the cache, quarantine, boundary, registry, generated outputs, and
tests together.

For `unis`, approved alias/campus identity review is not coordinate evidence by
itself. Each approved row must be partitioned into either the reviewed Census
cache or a geocoder-specific quarantine record before the import path can claim
that the approved row set has been processed.

Identity-authority exclusion review for rows that did not receive an accepted
alias/campus decision is generated with:

```sh
npm run verify:unis-identity
```

That command writes `data/unis/identity-review.json`. It is an exclusion and
readiness-control artifact, not an import artifact: NCES, DAPIP, and ORLIE/JIP
may corroborate row-level identity review, but they do not replace the primary
Datos.PR row source, provide coordinate authority, or make a row
generated-output eligible without the full alias/campus, public-address, and
Census-cache evidence chain. Current NCES, DAPIP, and ORLIE/JIP corroborations
in the artifact are exclusion/readiness-control evidence, not import evidence.
The ORLIE/JIP row-level subset is bounded in
`data/unis/orlie-jip-row-review.json`; it stores licensure-listing context only,
excludes personal contact fields, and does not provide coordinate authority or
public-address correction evidence.
The current follow-up stage is bounded in
`data/unis/corroborated-identity-followup-review.json`,
`data/unis/albizu-staged-review.json`, and
`data/unis/sagrado-staged-review.json`. Albizu and Sagrado have staged
alias/campus and public-address evidence only; those artifacts are not import
artifacts and do not create Census cache rows, coordinates, DB seed rows,
generated output, API coverage, or UI coverage.

Before broad `unis` geocoder refresh work begins, keep a checked-in exact-match
baseline at `data/unis/ipeds-geocode-audit.json`. Use that audit to document
how many rows already have auxiliary coordinate evidence, and keep
`importReadiness.status: blocked` until reviewed alias/campus match rules
either promote additional Puerto Rico rows into the approved cache or explain
their exclusion in the quarantine artifact.

For the active `unis` candidate, keep the reviewed alias/campus rules in
`docs/unis-alias-campus-match-policy.md` and record row-level outcomes in
`data/unis/ipeds-alias-campus-review.json` before unmatched rows move into the
approved Census cache path.

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

## Profile And Reach Contract Gate

Profile-dependent planning work now starts from the versioned contract in
`data/profile-reach/business-profile-reach-v1.json`.

That artifact must:

- hold one reviewed municipality/category selection constant;
- define the five geographic-reach levels from site-bound through
  external-connection;
- define the seven decision lenses in their documented order;
- include exactly one small/local, one medium/regional, and one
  large/strategic scenario;
- show profile-dependent relevance, criticality, confidence, limitations, and
  next validation checks without scores, ranks, or recommendations;
- distinguish registered-source facts from explicit source gaps so scenario
  growth does not silently invent evidence coverage.

Validate the profile/reach contract with:

```sh
npm run test:profile-reach-contract
```

The linked decision-signal registry now lives in
`data/profile-reach/decision-signal-registry-v1.json`.

That artifact must:

- cover all seven documented decision lenses;
- keep every signal tied to the fixed municipality/category selection;
- record applicable business-profile scenarios and the governing geographic
  reach for each linked scenario;
- distinguish registered Puerto Rico evidence from explicit source gaps;
- record recency and interpretation limits without drifting into scores, ranks,
  or recommendations;
- link each registry signal back to one or more facts in the
  business-profile/reach matrix.

Validate the decision-signal registry with:

```sh
npm run test:decision-signals
```

Reviewed signal-upgrade artifacts now live in
`data/profile-reach/aguada-restaurant-demand-proxy-review.json` and
`data/profile-reach/aguada-restaurant-island-demand-review.json` and
`data/profile-reach/aguada-restaurant-corridor-logistics-review.json` and
`data/profile-reach/aguada-restaurant-external-logistics-review.json` and
`data/profile-reach/aguada-restaurant-permit-path-review.json` and
`data/profile-reach/aguada-restaurant-utility-service-review.json` and
`data/profile-reach/aguada-restaurant-utility-resilience-review.json` and
`data/profile-reach/aguada-restaurant-site-screening-review.json` and
`data/profile-reach/aguada-restaurant-large-site-screening-review.json` and
`data/profile-reach/aguada-restaurant-routine-workforce-review.json` and
`data/profile-reach/aguada-restaurant-workforce-pipeline-review.json` and
`data/profile-reach/aguada-restaurant-construction-execution-review.json` and
`data/profile-reach/aguada-restaurant-coordination-timing-review.json` and
`data/profile-reach/aguada-restaurant-inspection-window-review.json` and
`data/profile-reach/aguada-restaurant-support-network-review.json`.

Each artifact must:

- stay tied to the fixed municipality/category selection;
- cite only official Puerto Rico authorities for the reviewed evidence lane;
- distinguish source-backed baseline evidence from unresolved timing,
  parcel-eligibility, case-outcome, continuity, or cost gaps;
- remain descriptive and avoid scores, rankings, recommendations, or launch
  promises;
- link back to the controlling decision-signal entry and its registered
  Puerto Rico source ids.

Validate the reviewed signal-upgrade artifacts with:

```sh
npm run test:demand-signal-review
npm run test:logistics-signal-review
npm run test:external-logistics-signal-review
npm run test:regulatory-signal-review
npm run test:infrastructure-signal-review
npm run test:utility-resilience-signal-review
npm run test:site-feasibility-signal-review
npm run test:large-site-signal-review
npm run test:routine-workforce-signal-review
npm run test:workforce-signal-review
npm run test:construction-execution-signal-review
npm run test:coordination-timing-signal-review
npm run test:inspection-window-signal-review
npm run test:ecosystem-signal-review
```

## Current Candidate Sources

- `cbps`: Datos.PR County Business Patterns 2014 Puerto Rico CSV and municipality CSV.
- `muns`: Datos.PR official Puerto Rico municipality boundary ZIP, plus the municipality-level CBP file where only tabular join data is needed.
- `unis`: Datos.PR higher education directory for Puerto Rico, academic year 2017-18.
- `unis` identity support: NCES College Navigator with the Puerto Rico state filter and spreadsheet export.
- `unis` accreditation support: U.S. Department of Education accreditation search with the Puerto Rico state filter.
- `unis` licensure support: Puerto Rico Department of State ORLIE/JIP public postsecondary listing.
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
