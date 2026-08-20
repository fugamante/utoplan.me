# Product Scope

`utoplan.Me` is a Puerto Rico business-formation planning tool. The active
modernization scope is to make source-backed local context visible before the
product attempts recommendations, rankings, or automated decisions.

## Active Product Question

The first product slice should help a user answer:

> Given this business model, scale, and intended market reach, what conditions
> in Puerto Rico could enable, constrain, delay, or materially change the
> investment?

The product should first capture the business's operating needs, then inspect
source-backed evidence at the geographic reach that governs each need. A
municipality is one useful boundary, not the default boundary for every signal.
The product should distinguish site-bound, local-catchment, regional-corridor,
island-wide, and external-connection evidence.

The decision model and sequencing are defined in
`docs/business-location-decision-framework.md`.

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
- Planning-context fixtures:
  `data/planning-context/*.json`.
- Planning-context read API:
  `GET /v1/planning-context` and `GET /v1/planning-context/:id`.
- Preserved API read schema: `dtoapi/modern/src/resource_contract.ts`.
- Database baseline: `db/migrations/202605211200_baseline_read_v1.md`.

The business-category crosswalk is intentionally candidate-grade. It only maps
user-facing categories to 2012 NAICS codes so future planning context can
select relevant CBP facts without turning those facts into opaque scores.

University or training-provider presence is supporting evidence inside the
workforce-capability lens. It must not lead the result or stand in for labor
availability. Education evidence becomes decision-relevant only when it can be
connected to required skills or occupations, defensible program output or
capacity, recency, and realistic travel or island-wide reach.

## Next Product Work

The first page now reads planning-context summaries and detail through
`GET /v1/planning-context` and `GET /v1/planning-context/:id` so descriptive
municipality/category slices can surface confidence, limitations, and
unresolved questions without adding scores, rankings, or recommendation
claims.

Those planning-context views now also surface candidate-review status, update
date, and registered-source count so users can tell that the current slices are
descriptive candidate context rather than production-grade decision support.

The same first screen now also surfaces the explicit partial `unis` coverage
limitation from the accepted reviewed Census-cache boundary instead of only the
coverage label.

Disclosure-limited and rounded CBP values now render under this policy so the
planning-context panel does not imply false precision:

- disclosure-limited `D` payroll or employment values render as `masked (disclosure-limited)`;
- rounded/noise-flagged `H` payroll or employment values render as `approx. <value>`;
- unflagged values remain numeric descriptive context only.

That contract now includes source-backed NAICS title text for the active
planning-context fixture codes so the detail panel can show industry labels
more clearly without inventing new decision logic.

Next, add explicit business-profile and geographic-reach contracts before
expanding planning-context fixtures. The next fixture set should keep business
category and place constant while varying small/local, medium/regional, and
large/strategic operating assumptions so the product proves that evidence
relevance and criticality change with scale.

That first profile/reach boundary now exists at
`data/profile-reach/business-profile-reach-v1.json`. It keeps
`mun003_restaurant` fixed while varying the three scale/reach scenarios and
marks each lens with explicit geographic reach, criticality, confidence,
limitations, and next validation checks. It is a controlled candidate artifact,
not API behavior or a recommendation engine.

The linked decision-signal registry now exists at
`data/profile-reach/decision-signal-registry-v1.json`. It records which fixed-
selection matrix facts already map to registered Puerto Rico evidence and which
remain controlled source gaps, along with scenario reach, recency, and
interpretation limits.

Reviewed signal-upgrade artifacts now exist at
`data/profile-reach/aguada-restaurant-demand-proxy-review.json` and
`data/profile-reach/aguada-restaurant-island-demand-review.json` and
`data/profile-reach/aguada-restaurant-corridor-logistics-review.json` and
`data/profile-reach/aguada-restaurant-external-logistics-review.json` and
`data/profile-reach/aguada-restaurant-permit-path-review.json` and
`data/profile-reach/aguada-restaurant-construction-execution-review.json` and
`data/profile-reach/aguada-restaurant-utility-service-review.json` and
`data/profile-reach/aguada-restaurant-utility-resilience-review.json` and
`data/profile-reach/aguada-restaurant-site-screening-review.json` and
`data/profile-reach/aguada-restaurant-large-site-screening-review.json` and
`data/profile-reach/aguada-restaurant-routine-workforce-review.json` and
`data/profile-reach/aguada-restaurant-workforce-pipeline-review.json` and
`data/profile-reach/aguada-restaurant-support-network-review.json`. They
upgrade the medium/regional demand, large/strategic island-wide demand,
medium/regional logistics, large/strategic external logistics,
regulatory-execution, strategic construction-execution observability,
small-scale infrastructure, medium/large utility resilience,
small/medium site-feasibility, large-site-feasibility, small/medium routine
workforce, strategic workforce, and medium/regional plus large/strategic
support-network lanes for the fixed Aguada restaurant scenario from pure
source gaps to source-backed descriptive reviews grounded in official Puerto
Rico authorities. They remain descriptive baseline evidence, not proof of
approval timing, interagency coordination quality, program eligibility,
parcel eligibility, outage duration, utility costs, backup coverage, route
reliability, supplier depth, partner density, cold-chain timing, kitchen
retrofit condition, parcel assembly, Aguada-specific customer capture, event
pull, one concept's conversion, Aguada-specific hiring depth, or launch
readiness.

The next product step is to replace the highest-risk source-gap signals in that
registry and matrix with registered Puerto Rico evidence before expanding
planning-context fixtures or adding recommendation behavior.

Pause university-directory expansion beyond maintenance of the accepted
partial boundary. Resume education-data work only when a workforce question
requires program, skill, completion or capacity evidence that the current
institution directory cannot answer.

Keep fixtures descriptive. Do not add a score, rank, or recommendation until
the underlying facts, confidence labels, and limitations are visible and
reviewed.
