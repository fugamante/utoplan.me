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
- Vintage: `Census2020_Current`
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

## Cache And Review Control

- Checked-in cache artifact:
  `data/geocoding/unis-census-geocoder-cache.json`
- Checked-in quarantine artifact:
  `data/geocoding/unis-import-quarantine.json`
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

## Quarantine Rule

Rows remain outside production-style `unis` import output when any of these
conditions hold:

- no Census match is returned for the normalized Puerto Rico address;
- the matched geography does not resolve within Puerto Rico; or
- the response lacks reviewed `x`/`y` coordinate evidence.

Each excluded row must be written to
`data/geocoding/unis-import-quarantine.json` with the reason for exclusion.
The source registry must keep `importReadiness.status` blocked until the
reviewed cache and quarantine artifact together explain the full source row
set.

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
- 27 rows remain excluded and are mirrored in the reviewed quarantine
  artifact.
