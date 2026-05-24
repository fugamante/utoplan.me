# Product Scope

## Product Position

utoplan.Me is a Puerto Rico business-planning context tool. The modernization branch is shaping the original hackathon project into a reproducible demo that helps a user explore municipality and business-category context from source-backed data.

The product is not a legal, financial, zoning, tax, lending, hiring, or market-demand advisor. It must not rank locations or recommend a business decision until the underlying datasets, assumptions, and validation evidence justify that behavior.

## Primary User

The first target user is a person exploring a small-business idea in Puerto Rico who needs a structured starting point:

- choose a municipality
- choose a broad business category
- see source-backed context and confidence limits
- save a local/demo planning profile
- continue the same planning session in a repeatable demo environment

## Current Product Slice

The current slice supports:

- Puerto Rico-only source registry and provenance/confidence metadata
- Business-category to NAICS crosswalk for starter categories
- DB-backed live planning context through `/v1/planning/context`
- Source-backed CBP facts for the selected municipality/category
- No scores, rankings, or recommendations
- DB-backed seeded demo session through `/v1/demo/session?session=demo-session-1`
- Browser-local planning profile saved under `utoplan.planningProfile.v1`
- Docker Postgres demo data seeded from checked-in non-production contracts

## Session Scope

The first session model has three intentionally separate layers:

- browser-local profile storage for business idea, municipality, and category preferences
- DB-backed local/demo session storage for seeded demo profile composition through `demo_sessions`
- gate-mounted anonymous session/profile API for caller-owned server-backed profile storage

Neither layer is a production account system. The current branch does not implement passwords, durable user authentication, role-based access, account recovery, or retention policy controls. Production user profiles require a separate privacy and authentication design before public use.

That production boundary is reserved in `docs/session-auth-contract.md` and `data/mappings/puerto-rico-session-auth-contract.json`. Production auth remains blocked until that contract is satisfied.

## Data Boundaries

Allowed in the current product slice:

- `cbps`, `muns`, and `unis` as source-backed candidate data with visible confidence limits
- `demo_sessions` as seeded non-production demo state
- Category mappings as product assumptions, not authoritative classifications

Blocked for planning use until source-backed:

- `cdepts`
- `businesses`
- `grade_cs`

## Next Product Direction

Next work should move from seeded demo session toward a deliberate user-session design:

- anonymous local session id
- browser-local saved planning profile
- database-backed saved session/profile
- anonymous session/profile API contract with same-origin cookie ownership, route-specific CORS, CSRF checks, separate anonymous storage, and optimistic concurrency
- username/password login only after privacy, retention, and authentication requirements are documented
- migration artifacts for reserved account-backed and anonymous session tables before any auth endpoints are enabled
