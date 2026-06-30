# `unis` Narrow Identity Match Policy

This document defines the narrow reviewed policy for promoting unmatched rows
from `data/unis/ipeds-geocode-audit.json` into the production-style `unis`
coordinate path.

The purpose is to recover clearly identifiable Puerto Rico institutions
without allowing broad name-alias inference that could weaken trust in later
analysis.

## Scope

This policy applies only to the active directory source
`datospr-higher-ed-directory-2017-18` and the checked-in auxiliary coordinate
source `nces-ipeds-postsecondary-2009`.

The exact-match baseline remains the first gate. This policy applies only to
rows that remain unmatched after the strict normalized institution-name plus
municipality audit.

## Non-Goals

This policy does not approve:

- fuzzy string matching;
- municipality centroid fallback;
- copying a parent-system coordinate to a branch or extension campus without
  row-level evidence;
- promoting rows based only on a plausible institutional reputation or human
  familiarity;
- using demo fixtures, seed rows, or manually invented coordinates as
  production evidence.

## Approved Review Outcomes

Each unmatched directory row must end in exactly one reviewed outcome:

1. `approved-alias`
2. `approved-campus`
3. `quarantined`

Rows may not remain prose-only once reviewed.

## Approval Rules

### `approved-alias`

Promote a row as `approved-alias` only when all of these checks pass:

- The directory municipality and auxiliary municipality resolve to the same
  Puerto Rico municipality or to a documented neighborhood label within the
  same municipality, such as `Hato Rey`, `Cupey`, or `Rio Piedras` within San
  Juan.
- Review identifies exactly one auxiliary candidate row.
- Evidence includes either an exact street-address match or explicit source
  text that directly names the auxiliary institution.
- The name difference is limited to translation, accent or punctuation
  variation, school-versus-university wording, or a clearly documented brand
  rename.
- The directory row and auxiliary row do not conflict on campus identity or
  address intent.

### `approved-campus`

Promote a row as `approved-campus` only when all of these checks pass:

- The directory municipality and auxiliary municipality resolve to the same
  Puerto Rico municipality or to a documented neighborhood label within the
  same municipality.
- Review identifies exactly one auxiliary candidate row.
- Evidence includes an exact or near-exact campus address match.
- The auxiliary row names the same campus or site explicitly rather than only
  a broader parent system.
- The approval note explains why the campus-level identity is considered the
  same import target under the preserved legacy `unis` table.

### `quarantined`

Quarantine the row when any of these conditions hold:

- No auxiliary candidate can be tied to the directory row unambiguously.
- Candidate rows disagree on municipality or campus identity.
- Review would rely on a non-address-based name guess.
- The auxiliary source appears to identify only a parent system while the
  directory row appears to identify a distinct campus or extension site.

## Required Review Artifact

Record all reviewed outcomes in the checked-in artifact:

- `data/unis/ipeds-alias-campus-review.json`

Each approved match must include:

- directory institution name;
- directory municipality;
- directory address;
- auxiliary institution name;
- auxiliary municipality;
- auxiliary `unitid`;
- decision type;
- evidence summary;
- reviewer;
- review date.

Each quarantined row must include:

- directory institution name;
- directory municipality;
- directory address;
- quarantine reason;
- reviewer;
- review date when reviewed.

## Downstream Use

Only rows approved in `data/unis/ipeds-alias-campus-review.json` may be added
to `data/geocoding/unis-census-geocoder-cache.json` through the live Census
geocoder workflow.

Rows marked `quarantined` must also appear in
`data/geocoding/unis-import-quarantine.json` until new evidence changes the
decision.

## Current Status

As of 2026-06-11, the first reviewed pass is checked in:

- `data/unis/ipeds-alias-campus-review.json` records 19 approved narrow
  alias/campus matches and 27 quarantined rows from the 46 previously
  unmatched entries.
- As of 2026-06-23, `data/geocoding/unis-census-geocoder-cache.json` records
  4 reviewed Puerto Rico Census matches from those 19 approved rows.
- `data/geocoding/unis-public-address-review.json` records the row-level
  public-address review for the 16 approved rows that initially failed the
  pinned Census path; 1 row was promoted and 15 remain excluded.
- `data/geocoding/unis-import-quarantine.json` keeps the 27 identity-
  quarantined rows and adds 15 geocoder-specific exclusions for approved rows
  that did not return reviewed Puerto Rico Census matches.
- `data/unis/identity-review.json` now records that all 27 identity-
  quarantined rows remain reviewed-excluded; 5 have NCES identity/campus plus
  DAPIP accreditation and ORLIE/JIP licensure-listing corroboration, 22 still
  lack row-level authority corroboration, and zero are coordinate-eligible or
  generated-output eligible.
- `data/geocoding/unis-address-verification.json` verifies that those 15
  geocoder-specific exclusions currently have zero promotion-eligible rows
  under the pinned Census benchmark/vintage.
- `data/geocoding/unis-import-boundary-review.json` records that partial
  production-style import from the 4 cache-backed rows is accepted with
  explicit coverage language.
- `node scripts/build_unis_slice.js` generates only those 4 cache-backed rows
  into `data/generated/unis-partial-import.json` and
  `docker/postgres/002_unis_partial_seed.sql`. Legacy `desc` values come only
  from `data/unis/partial-source-fields.json` for the same accepted rows.
- Full `unis` import readiness remains blocked until corrected address evidence
  changes the zero-promotion verification result or row-level authority review
  changes `data/unis/identity-review.json` and the full evidence chain.
