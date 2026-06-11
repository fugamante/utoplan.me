# `unis` Alias And Campus Match Policy

This document defines the reviewed approval policy for promoting unmatched
rows from `data/unis/ipeds-geocode-audit.json` into the production-style
`unis` coordinate path.

It exists to keep alias and campus decisions reproducible, row-specific, and
separate from demo fixtures, seed data, or undocumented operator judgment.

## Scope

This policy applies only to the active directory source
`datospr-higher-ed-directory-2017-18` and the checked-in auxiliary coordinate
source `nces-ipeds-postsecondary-2009`.

The exact-match baseline remains the first gate. This policy only governs
rows that remain unmatched after the strict exact institution-name plus
municipality audit.

## Non-Goals

This policy does not approve:

- fuzzy string matching;
- municipality centroid fallback;
- copying a parent-system coordinate to a branch or extension campus without
  row-level evidence;
- using demo fixtures, seed rows, or manually invented coordinates as
  production evidence.

## Approved Review Outcomes

Each unmatched directory row must end in exactly one reviewed outcome:

1. `approved-alias`
2. `approved-campus`
3. `quarantined`

Rows may not remain implicit or prose-only once reviewed.

## Approval Rules

### `approved-alias`

Promote a row as `approved-alias` only when all of these checks pass:

- The directory municipality and auxiliary municipality resolve to the same
  Puerto Rico municipality.
- Review identifies exactly one auxiliary candidate row.
- The reviewer can explain the name difference as an institution alias,
  orthographic variation, abbreviation, translation, or formatting difference
  rather than a different school.
- The directory row and auxiliary row do not conflict on campus identity or
  address intent.

### `approved-campus`

Promote a row as `approved-campus` only when all of these checks pass:

- The directory municipality and auxiliary municipality resolve to the same
  Puerto Rico municipality.
- Review identifies exactly one auxiliary candidate row.
- Evidence shows the directory row and auxiliary row refer to the same
  physical campus or colocated instructional site, not merely the same parent
  system.
- The approval note explains why campus-level identity is considered the same
  import target under the preserved legacy `unis` table.

### `quarantined`

Quarantine the row when any of these conditions hold:

- No auxiliary candidate can be tied to the directory row unambiguously.
- Candidate rows disagree on municipality or campus identity.
- The auxiliary source appears to identify only a parent system while the
  directory row appears to identify a distinct campus or extension site.
- Review would rely on fuzzy similarity or undocumented human memory.

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

- `data/unis/ipeds-alias-campus-review.json` records 19 approved alias/campus
  matches and 27 quarantined rows from the 46 previously unmatched entries.
- `data/geocoding/unis-import-quarantine.json` now mirrors the reviewed
  quarantined rows.
- `unis` import readiness remains blocked because the approved rows still need
  reviewed Census geocoder cache entries before preserved `lat`/`long` values
  can be imported.
