# Business Location Decision Framework

`utoplan.Me` should organize evidence around the operating needs of a business,
not around the datasets that happen to be available. A university directory,
municipality boundary, or industry count is an input. None is the product's
primary unit of analysis.

## Decision To Support

The product should help a user answer:

> Given this business model, scale, and intended market reach, what conditions
> in Puerto Rico could enable, constrain, delay, or materially change the
> investment?

The answer should expose fit, gaps, tradeoffs, and unknowns. It should not imply
that one municipality is universally best or that one nearby institution makes
a location viable.

## Business Profile Before Place

Every planning scenario should start with a lightweight operating profile:

- business category and operating model;
- current and target scale;
- site count, space, land, and facility needs;
- hiring volume, occupations, skill requirements, and shift patterns;
- capital intensity and tolerance for interruption;
- customer mix and intended market reach;
- inbound and outbound logistics needs;
- utility, broadband, permitting, and regulatory dependencies;
- supplier, partner, and service dependencies;
- launch horizon and expected growth path.

Small, medium, and large are scenario defaults, not legal classifications or
fixed employee thresholds:

| Profile | Typical operating pattern | Location questions that gain weight |
| --- | --- | --- |
| Small / local | One site, modest capital exposure, small hiring cohort, local or visitor demand | Affordable suitable space, immediate customer access, basic utilities, permits, owner commute, nearby services, and survivability of fixed costs |
| Medium / regional | Larger hiring cohorts, multiple shifts or sites, wider supplier and customer catchment | Labor depth, road access, utility capacity and reliability, supplier coverage, expansion room, corridor reach, and municipal execution |
| Large / strategic | High capital or headcount exposure, specialized facilities, complex supply chains, island-wide or export reach | Redundant power/water/telecom, ports and airports, large-site readiness, specialized workforce pipelines, regulatory coordination, incentives, resilience, and long-term expansion capacity |

The user-supplied operating facts should override these defaults. A small data
center can have large-business infrastructure needs; a large remote-services
employer can have little freight dependency.

## Reach Before Administrative Boundaries

Puerto Rico's scale means that municipality-only analysis can create false
precision. Evaluate each requirement at the reach that governs it:

- **Site-bound:** parcel or immediate-area conditions such as zoning, hazards,
  utility service, access, rent, and facility readiness.
- **Local catchment:** customers, workers, and services reachable within a
  business-appropriate travel time.
- **Regional corridor:** supplier, labor, and logistics access spanning several
  municipalities.
- **Island-wide:** resources a business can realistically draw from anywhere in
  Puerto Rico, including specialized talent and professional services.
- **External connection:** ports, airports, subsea connectivity, remote labor,
  mainland or international suppliers, and export markets.

Travel time, reliability, capacity, and cost are usually more meaningful than
straight-line distance or the presence of a resource inside the same
municipality.

## Decision Lenses

Present evidence in this order. The importance of each lens changes with the
business profile.

1. **Hard constraints and site feasibility:** land/building fit, zoning and
   permits, hazards, required utilities, environmental constraints, and launch
   timing.
2. **Demand and market reach:** relevant customers, spending or activity
   proxies, tourism or business demand where applicable, competition, and
   reachable market size.
3. **Infrastructure, reliability, and cost:** power, water, broadband, roads,
   operating costs, redundancy, and recovery exposure.
4. **Workforce capability:** occupation-specific labor depth, demonstrated
   skills, wages, commuting reach, hiring competition, and training capacity.
5. **Logistics and supply chain:** suppliers, freight routes, ports, airports,
   delivery time, cold chain or other special handling, and dependency risk.
6. **Regulatory and execution environment:** permits, licensing, incentives,
   municipal and Commonwealth dependencies, lead times, and evidence of
   execution capacity.
7. **Ecosystem, resilience, and growth:** customers and partners, professional
   services, disaster resilience, expansion space, and ability to scale without
   relocating.

## Education And Training Evidence

Academic institutions belong inside the workforce-capability lens. Institution
presence alone is not a workforce signal and should never lead the result.

Education or training evidence becomes decision-relevant only when the product
can connect:

- the business's required occupations and skills;
- relevant programs, credentials, apprenticeships, or training offerings;
- recent completions or another defensible throughput measure;
- capacity, recency, and delivery mode;
- realistic worker travel time or island-wide availability;
- employer competition, retention, and upskilling potential.

Institution identity and location may explain the evidence, but prestige,
campus count, and proximity must not stand in for skill supply. For many
businesses, existing worker availability, wages, migration, remote work, or a
trainable adjacent workforce will matter more.

## Evidence Output

For each lens, return:

- **Relevance:** why the signal matters to this business profile;
- **Observed context:** source-backed facts at the correct geographic reach;
- **Fit or gap:** whether a stated need appears met, constrained, or unresolved;
- **Criticality:** blocker, material tradeoff, secondary consideration, or
  informational;
- **Confidence:** source quality, recency, geographic fit, and known limits;
- **Next check:** what the user should validate before acting.

Criticality is profile-dependent. It is not a universal score. Early versions
should compare evidence without producing an opaque composite rank.

## Product Sequencing

1. Define the business-profile and geographic-reach contracts.
2. Create a decision-signal registry for the seven lenses, including source,
   geography, recency, interpretation limits, and applicable business profiles.
3. Build fixtures that hold business category and place constant while changing
   scale and reach; verify that relevance and criticality change visibly.
4. Add site-feasibility, infrastructure, market, workforce, logistics, and
   execution evidence in that priority order as sources become defensible.
5. Use education/training evidence only after occupation-to-skill and
   program-output links are supported.
6. Consider comparative recommendations only after users can inspect the
   evidence, assumptions, gaps, and confidence behind them.
