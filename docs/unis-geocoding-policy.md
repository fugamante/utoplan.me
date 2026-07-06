# `unis` Geocoding Policy

This document defines the approved geocoding policy for deriving preserved
`unis.lat` and `unis.long` values from the registered Puerto Rico higher
education directory candidate `datospr-higher-ed-directory-2017-18`.

The goal is to make coordinate generation reproducible without inventing
locations, reusing demo fixtures, or silently changing provider behavior.

## Approved Provider

- Provider: U.S. Census Geocoding Services API
- Endpoint family: `geographies/onelineaddress`
- Benchmark: `Public_AR_Census2020`
- Vintage: `Census2020_Census2020`
- Scope: Puerto Rico only

The benchmark and vintage pair are pinned here for reproducibility. Change them
only through a reviewed registry and documentation update.

## Input Construction

Build one single-line address candidate per source row from these source
fields, in order:

1. `Dirección Física`
2. `Dirección Física 2`
3. `Pueblo`
4. Literal suffix `Puerto Rico`

Normalization rules:

- Trim leading and trailing whitespace from each field.
- Drop empty fields.
- Join remaining fields with `, `.
- Do not substitute municipality centroids, postal-code centroids, or fixture
  coordinates when the address is incomplete or unmatched.

## Acceptance Rule

Accept a geocoding result only when all of these checks pass:

- The response returns matched coordinates.
- The resolved geography remains in Puerto Rico.
- The importer can map longitude from response `x` and latitude from response
  `y`.

Rows that fail any check remain excluded from production-style import until
their address is corrected or a reviewed exception path is added.

## ZIP Variance Rule

For Puerto Rico university rows, ZIP codes are supporting address evidence, not
the primary identity discriminator. Large campuses and San Juan neighborhoods
may span or border nearby ZIP areas, and official or authority pages may show
minor ZIP variation for the same street/campus location.

Do not block an alias/campus or public-address staged decision only because of
nearby ZIP variance when all of these are true:

- official or recognized authority sources corroborate the same institution;
- the street/campus address aligns materially across sources;
- the municipality or documented neighborhood remains consistent; and
- the row remains outside Census cache, coordinates, and generated output until
  a later pass selects one reviewed geocoder candidate address.

Record the variance in the review artifact, but do not spend additional passes
trying to prove a single exact ZIP unless the street/campus identity is
ambiguous or the ZIP points to a materially different location.

## Cache And Review Control

- Checked-in cache artifact:
  `data/geocoding/unis-census-geocoder-cache.json`
- Checked-in quarantine artifact:
  `data/geocoding/unis-import-quarantine.json`
- Checked-in import-boundary review artifact:
  `data/geocoding/unis-import-boundary-review.json`
- Checked-in public-address review artifact:
  `data/geocoding/unis-public-address-review.json`
- Checked-in staged Sagrado alias/public-address review artifact:
  `data/unis/sagrado-staged-review.json`
- Checked-in read-only Sagrado geocoder candidate review artifact:
  `data/geocoding/sagrado-geocoder-candidate-review.json`
- Checked-in alias/campus review artifact:
  `data/unis/ipeds-alias-campus-review.json`
- Alias/campus review policy:
  `docs/unis-alias-campus-match-policy.md`
- Required source review fields per cached record:
  source id, normalized address, benchmark, vintage, longitude, latitude,
  Puerto Rico geography evidence, review status, and review timestamp
- Required quarantine fields per excluded row:
  source id, normalized address, exclusion reason, review status, and review
  timestamp when applicable
- Re-run trigger:
  source-address change, benchmark/vintage change, provider contract change, or
  cache schema change

The checked-in cache is the reproducible import artifact. Live API responses
may be used only to build or refresh that artifact under this policy.

Rebuild the cache and geocoder-specific quarantine records with:

```sh
node scripts/sync_unis_census_geocoder_cache.js
```

## Quarantine Rule

Rows remain outside production-style `unis` import output when any of these
conditions hold:

- no Census match is returned for the normalized Puerto Rico address;
- the matched geography does not resolve within Puerto Rico; or
- the response lacks reviewed `x`/`y` coordinate evidence.

Each excluded row must be written to
`data/geocoding/unis-import-quarantine.json` with the reason for exclusion.
The source registry must keep `importReadiness.status` blocked until the
reviewed cache, quarantine artifact, and import-boundary review together
explain the full source row set and any accepted partial coverage.

## Exact-Match Baseline

Before using the live geocoder for broad row coverage, review the checked-in
exact-match audit at `data/unis/ipeds-geocode-audit.json`.

Current baseline on 2026-06-11:

- Auxiliary source: Puerto Rico IPEDS postsecondary coordinates on Datos.PR
- Match rule: normalized exact institution name plus municipality only
- Coverage: 11 exact matches out of 57 directory rows
- Remaining gap: 46 rows still need reviewed alias/campus handling or
  quarantine

This audit is intentionally strict. It is a safety baseline for reviewed join
policy, not a fuzzy-matching permission slip.

## Alias And Campus Review Gate

Before broad geocoder refresh work begins for unmatched rows, complete the
review gate defined in `docs/unis-alias-campus-match-policy.md` and record the
row-level outcomes in `data/unis/ipeds-alias-campus-review.json`.

Only rows with reviewed `approved-alias` or `approved-campus` decisions may
move forward into the checked-in Census cache workflow. Quarantined rows must
stay excluded until new public-source evidence justifies a reviewed change.

Current reviewed baseline on 2026-06-11:

- 19 unmatched rows are now approved for cache-building work through the
  alias/campus review artifact.
- 27 rows remain excluded by identity review and are recorded in the reviewed
  quarantine artifact and in the row-level identity-review artifact at
  `data/unis/identity-review.json`. The identity-review artifact currently
  records 5 NCES+DAPIP+ORLIE/JIP-corroborated identity/campus candidates, 22
  rows without row-level authority corroboration, and zero coordinate-eligible
  or generated-output-eligible identity-quarantined rows.
- Sagrado has staged alias/campus and public-address evidence in
  `data/unis/sagrado-staged-review.json`; the read-only candidate review in
  `data/geocoding/sagrado-geocoder-candidate-review.json` records zero Puerto
  Rico Census matches and does not create cache rows, coordinates, generated
  output, API coverage, or UI coverage.

Current cache baseline on 2026-06-23:

- The checked-in Census cache contains 4 reviewed Puerto Rico matches from the
  19 approved alias/campus rows.
- `data/geocoding/unis-public-address-review.json` records the row-level
  public-address review for the 16 previously geocoder-quarantined approved
  rows. The board now records the current reviewed address, active or stale
  location status, the exact official candidate address tested, and the
  resulting Census outcome. One official-address correction advanced into the
  reviewed Census cache; the remaining 15 rows stay excluded.
- The other 15 approved alias/campus rows still did not return reviewed Puerto
  Rico Census geocoder matches under the pinned benchmark/vintage pair and
  remain excluded through `data/geocoding/unis-import-quarantine.json`.
- `data/geocoding/unis-address-verification.json` records the current pinned
  verification rerun for those 15 rows: 13 reviewed address candidates were
  attempted, 2 rows lacked current official address evidence for rerun, and 0
  rows are promotion-eligible. A non-promoted Puerto Rico response remains
  blocked when the matched Census address conflicts with the reviewed public
  address.
- `data/geocoding/unis-import-boundary-review.json` records the accepted
  partial import boundary for the 4 cache-backed rows. API/UI coverage language
  must keep this visible as partial source-backed coverage, not complete Puerto
  Rico higher-education coverage.
- `node scripts/build_unis_slice.js` operationalizes only that accepted subset
  into `data/generated/unis-partial-import.json` and
  `docker/postgres/002_unis_partial_seed.sql`; the generated seed must not
  include rows from `data/geocoding/unis-import-quarantine.json`. Legacy
  detail fields such as `desc` may be populated only from
  `data/unis/partial-source-fields.json` for rows that exactly match the
  accepted cache-backed subset.
- Full `unis` import readiness remains blocked until new corrected address
  evidence changes the zero-promotion verification result or
  `data/unis/identity-review.json` records all required row-level authority
  evidence and the full alias/campus, public-address, and Census-cache evidence
  chain changes together.
