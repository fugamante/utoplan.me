# Product Scope

`utoplan.Me` is a Puerto Rico business-formation planning tool. The active
modernization scope is to make source-backed local context visible before the
product attempts recommendations, rankings, or automated decisions.

## Active Product Question

The first product slice should help a user inspect:

- what municipality or place they are considering;
- what type of business they are exploring;
- which source-backed facts describe nearby industry and education context;
- which facts are candidate-grade, blocked, or unresolved;
- which follow-up checks are still needed before acting.

## Current Product Boundary

The product may show descriptive planning context from registered Puerto
Rico-only sources. It must not present:

- site recommendations;
- municipality rankings;
- profitability or demand conclusions;
- zoning, permit, financing, or legal conclusions;
- inferred source joins without visible confidence and limitations.

## Current Planning Contracts

- Source registry: `data/sources/puerto-rico.json`.
- Source-to-legacy mapping: `docs/data-source-schema-mapping.md`.
- Business category crosswalk:
  `data/mappings/puerto-rico-business-categories.json`.
- Preserved API read schema: `dtoapi/modern/src/resource_contract.ts`.
- Database baseline: `db/migrations/202605211200_baseline_read_v1.md`.

The business-category crosswalk is intentionally candidate-grade. It only maps
user-facing categories to 2012 NAICS codes so future planning context can
select relevant CBP facts without turning those facts into opaque scores.

## Next Product Work

Build a small planning-context fixture that combines:

- one municipality reference;
- one business category from the crosswalk;
- matching CBP facts selected by NAICS code and municipality code;
- relevant source metadata and confidence labels;
- unresolved questions.

Keep the fixture descriptive. Do not add a score, rank, or recommendation until
the underlying facts, confidence labels, and limitations are visible and
reviewed.
