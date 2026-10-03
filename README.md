# utoplan.Me

`utoplan.Me` is a planning tool being developed to evaluate how and where a
business can take root in Puerto Rico. It starts with the business's operating
model, scale, and market reach, then examines the site, demand, infrastructure,
workforce, logistics, execution, and resilience conditions that could enable or
constrain it before capital, time, and people are committed.

This repository is the modernization fork of the original Imaginary Films
hackathon prototype. The current work preserves the useful public behavior of
that prototype while rebuilding the application as a reproducible, testable,
PostgreSQL-backed Node and TypeScript system with explicit data provenance.

## Current State

Today, you can explore a Puerto Rico map and selected descriptive planning-context
slices, including source references, confidence, and unresolved questions. Coverage
is partial; the app does not yet recommend sites, rank municipalities, or predict
business viability. See [Product Scope](docs/product-scope.md) for the current boundary
and [Modernization Roadmap](docs/modernization-roadmap.md) for the next gates.

- Static browser app with same-origin `/v1/*` data requests.
- Modern TypeScript Node API compatibility layer under `dtoapi/modern`.
- PostgreSQL-backed deployment path with health and readiness checks.
- Puerto Rico-only source-backed data intake and quarantine contracts.
- Fixed-scenario demand, workforce, site, infrastructure, and permit baselines
  recorded as reviewed Puerto Rico evidence where official sources are pinned.
- Period-bound regulatory timing sources now carry machine-checkable
  `timeScope` metadata so publication cadence, observed periods, and
  service-window claims stay distinct in the source registry.
- Docker and host-native validation for app, API, database, and proxy paths.
- IEEE-aligned planning, design, quality, test, and verification documentation.

## Installation

utoplan.Me currently runs from source. There is no standalone installer.

### Prerequisites

- Git to clone the repository.
- Node 26.x and npm. The required Node version is recorded in `.nvmrc` and
  `.node-version`.
- A POSIX shell such as Bash or Zsh for the command examples below.
- Docker with Docker Compose, with the Docker engine running, for the seeded
  database-backed workflow. The map demo does not require Docker.

### 1. Get the source

```sh
git clone https://github.com/fugamante/utoplan.me.git utoplanMe
cd utoplanMe
```

If you already have a checkout, enter its root directory instead.

### 2. Select Node and install dependencies

If you use nvm, activate the pinned Node version:

```sh
nvm install
nvm use
```

With Node 26.x active, install all workspace dependencies:

```sh
npm run install:all
```

This installs the root package, browser app, API launcher, and modern API.

## Quick Start

Complete [Installation](#installation) first, then run these commands from the
repository root. Choose the map demo for a first look or the app and API workflow
to explore planning-context details.

**Map demo — no database required**

For a first look at the map and layer controls:

```sh
UTOPLAN_DEMO_FIXTURE=1 npm run start:app
```

Open [http://localhost:8080](http://localhost:8080). This mode serves the checked-in
university fixture; it does not provide the API-backed planning-context views.
Map tiles still require internet access. Stop the app with `Ctrl+C`.
In this mode, the Planning context panel displays “unavailable”; use the app
and API workflow below to load those views.

**App and API — seeded local database required**

To explore the planning-context summaries and descriptive detail, use Docker
Compose to start the repository's seeded development/test database:

```sh
docker compose up -d --build --wait db
docker compose port db 5432
```

The second command prints `127.0.0.1:<port>`. Use that port below; Compose assigns
it dynamically. The credentials shown here belong to this local test service.

```sh
DATABASE_HOST=127.0.0.1 \
DATABASE_PORT=<port> \
DATABASE_USER=postgres \
DATABASE_PASSWORD=postgres \
DATABASE_DB=dtoapi_test \
npm run start:local
```

Replace `<port>` before running. Use a shell without existing `DATABASE_URL` or
`TEST_DATABASE_*` settings, since those override the connection values above.
If you already have a local PostgreSQL database, it must satisfy the
[`baseline-read-v1` schema](docs/database-migrations.md); an empty database is
insufficient.

`npm run start:local` starts the API on `UTOPLAN_API_PORT` or `3001`, waits for
`/readyz`, then starts the static app on `UTOPLAN_APP_PORT` or `8080`. The
browser continues to request same-origin paths such as `/v1/unis`.

Open [http://localhost:8080](http://localhost:8080), select a planning-context
option, and inspect its sources, confidence, limitations, and unresolved questions.
The seeded database demonstrates the workflow; it is not a production dataset.

Stop the app and API with `Ctrl+C`, then stop the local database with
`docker compose stop db`.

### If startup fails

- **Node version error:** activate Node 26.x and rerun the command.
- **API readiness timeout:** check the database is running, the assigned port and
  credentials match, and the `baseline-read-v1` schema is present. The app starts
  only after the API is ready.
- **Port already in use:** set `PORT` for the demo, or `UTOPLAN_APP_PORT` and
  `UTOPLAN_API_PORT` for the integrated workflow, then open the chosen app port.
- **Map tiles show “403 Access blocked”:** the external OpenStreetMap tile service
  has rejected the browser's requests. Tile images send only the site origin as
  their referrer, as required by the provider; browser privacy settings or network
  filters that strip it can still prevent tiles from loading. Markers and API-backed planning-context
  views can still load, but the basemap preview is incomplete.

For validation commands, see [Validation Commands](#validation-commands).

## Product Vision

`utoplan.Me` aims to help founders, investors, planners, and local development
teams evaluate the economic potential of a business in Puerto Rico through
place-based analysis.

The tool is intended to correlate site feasibility, demand, infrastructure,
workforce capability, logistics, execution conditions, business density, and
industry patterns at the reach appropriate to each business need. Municipality
boundaries remain useful, but local catchments, regional corridors, island-wide
access, and external connections may be more decision-relevant.

Education and training are supporting workforce evidence rather than the
organizing principle. A nearby institution matters only when its current
programs or training capacity connect to skills the business needs.

This lets users reason about the full lifecycle of establishing a business:

- **Conception:** identify viable business ideas, market gaps, and promising
  locations.
- **Planning:** evaluate zoning, municipal context, nearby institutions,
  workforce/resource availability, and economic fit.
- **Inception:** support the establishment path with location intelligence,
  operational assumptions, and local constraints.
- **After launch:** continue analyzing the surrounding ecosystem so the business
  can adapt, expand, or reposition.

In that sense, `utoplan.Me` is meant to both simulate and stimulate business
creation. It simulates by modeling place-based opportunities and constraints. It
stimulates by making those opportunities visible enough to guide investment,
planning, and action.

## Project Origin

`utoplan.Me` began during the Puerto Rico Cuenta Hackathon as an attempt to
turn labor-market and economic datasets into a practical planning tool for new
businesses in Puerto Rico.

The original team had access to data that offered a strong foundational view of
Puerto Rico's labor marketplace and economic composition. From that launchpad,
the team shaped the premise of a tool that could help people reason about where
and how a business might establish itself.

The prototype was crude and did not continue after the event, but the concept
earned second place because it pointed at a real need: helping entrepreneurs,
investors, and planners understand local conditions before committing capital,
time, and people.

This modernization fork revives that premise with a stronger technical
foundation, clearer data provenance, and a more deliberate product direction.

## Guiding Philosophy

Business planning is spatial. Where something happens changes what is possible,
what is constrained, and what must be assembled for an idea to become viable.

For Puerto Rico, that means generic market assumptions are not enough. The tool
should respect local context: municipalities, zoning, infrastructure, education,
labor signals, industry patterns, and the lived economic geography of the
island.

`utoplan.Me` should help reveal relationships between those conditions without
pretending to replace judgment. Its role is to organize evidence, expose
tradeoffs, and make better planning questions available earlier in the process.

Trustworthy provenance is part of the product. Because the intended decisions
can involve investment, permitting, hiring, and long-term commitments, data must
be source-backed, scoped clearly, and separated from demo or test fixtures.

## Modernization Scope

This fork focuses on turning the original prototype into a reproducible,
testable, and deployable foundation for that larger economic planning engine.

The current modernization work is centered on:

- Preserving the public behavior of the legacy prototype where it is known.
- Replacing the retired legacy API stack with a modern TypeScript Node API.
- Keeping the browser app map-first and compatible with same-origin `/v1/*`
  data requests.
- Establishing a PostgreSQL-backed deployment path with health and readiness
  checks.
- Rebuilding the data path around Puerto Rico-only, source-backed records.
- Separating demo fixtures, test seed data, and future production data.
- Documenting unresolved provenance gaps before treating recovered or
  replacement data as authoritative.

## Project Layout

### Runtime

- `app/`: dependency-free Node static web app and first-party browser assets.
- `dtoapi/`: legacy API package shell plus modern API launch path.
- `dtoapi/modern/`: TypeScript API compatibility server and tests.
- `docker/postgres/`: seeded PostgreSQL initialization artifacts.

### Product And Architecture Docs

- `docs/api-reference.md`: complete active HTTP API reference, response contracts, and static proxy behavior.
- `docs/api-modernization.md`: modern API replacement notes.
- `docs/business-location-decision-framework.md`: business-scale, geographic-reach, and decision-lens model for product work.
- `docs/database-migrations.md`: production database migration artifact strategy.
- `docs/deployment-topology.md`: integrated app/API deployment topology.
- `docs/frontend-inventory.md`: static app source and asset inventory.
- `docs/modernization-roadmap.md`: modernization plan and phase gates.
- `docs/production-deployment.md`: production deployment checklist and rollback runbook.
- `docs/standards/`: active IEEE 730, 828, 829, 830, 1016, 1012, and 1058
  standards corpus plus audit guides for ongoing modernization governance.

### Data And Provenance

- `docs/data-intake.md`: Puerto Rico-only source intake contract and registry policy.
- `docs/data-provenance.md`: known evidence and open gaps for the original
  hackathon dataset.
- `data/profile-reach/`: versioned business-profile and geographic-reach
  contract artifacts, decision-signal registry metadata, and scenario matrices
  for profile-dependent planning checks.
- `data/profile-reach/aguada-restaurant-permit-path-review.json`: reviewed
  regulatory-path evidence for the fixed Aguada restaurant scenario, scoped to
  official Puerto Rico permit, fire, health, and municipal-patent sources.
- `data/profile-reach/aguada-restaurant-utility-service-review.json`: reviewed
  utility-service baseline evidence for the fixed Aguada restaurant scenario,
  scoped to official Puerto Rico electricity-rate governance, outage-reporting,
  and Aguada water-service interruption sources.
- `data/profile-reach/aguada-restaurant-utility-resilience-review.json`:
  reviewed utility-resilience baseline evidence for the fixed Aguada restaurant
  medium/regional and large/strategic scenarios, scoped to official Puerto
  Rico Energy Bureau reliability and resource-adequacy oversight plus PRASA
  emergency and operations sources.
- `data/profile-reach/aguada-restaurant-site-screening-review.json`: reviewed
  site-screening baseline evidence for the fixed Aguada restaurant scenario,
  scoped to official Puerto Rico Planning Board zoning, flood, district, and
  Aguada hazard sources.
- `data/profile-reach/aguada-restaurant-workforce-pipeline-review.json`:
  reviewed island-wide workforce baseline evidence for the fixed Aguada
  restaurant strategic scenario, scoped to official Puerto Rico labor-market
  occupation, wage, openings, and growth publications.
- `data/profile-reach/aguada-restaurant-support-network-review.json`:
  reviewed ecosystem and support-network baseline evidence for the fixed
  Aguada restaurant medium/regional and large/strategic scenarios, scoped to
  official Puerto Rico DDEC entrepreneurship and incentives guidance plus the
  Puerto Rico housing-recovery incubator or accelerator program surface.
- `data/profile-reach/aguada-restaurant-routine-workforce-review.json`:
  reviewed routine workforce baseline evidence for the fixed Aguada restaurant
  small/local and medium/regional scenarios, scoped to official Puerto Rico
  labor-market wage, role-volume, and annual-openings publications.
- `data/profile-reach/aguada-restaurant-demand-proxy-review.json`: reviewed
  west-region demand proxy evidence for the fixed Aguada restaurant
  medium/regional scenario, scoped to official Puerto Rico tourism occupancy
  and visitor-profile publications.
- `data/profile-reach/aguada-restaurant-island-demand-review.json`: reviewed
  island-wide demand baseline evidence for the fixed Aguada restaurant
  large/strategic scenario, scoped to official Puerto Rico Tourism Company
  visitor-expenditure and passenger-movement publications.
- `data/profile-reach/aguada-restaurant-corridor-logistics-review.json`:
  reviewed corridor logistics baseline evidence for the fixed Aguada
  restaurant medium/regional scenario, scoped to official Puerto Rico west-
  corridor transport-planning and airport cargo publications.
- `data/profile-reach/aguada-restaurant-external-logistics-review.json`:
  reviewed external-connection logistics baseline evidence for the fixed
  Aguada restaurant large/strategic scenario, scoped to official Puerto Rico
  air and maritime cargo inventory.
- `data/profile-reach/aguada-restaurant-construction-execution-review.json`:
  reviewed strategic construction-execution observability evidence for the
  fixed Aguada restaurant large/strategic scenario, scoped to official Puerto
  Rico PEMAS construction-permit publication coverage.
- `data/profile-reach/aguada-restaurant-coordination-timing-review.json`:
  reviewed aggregate interagency recommendation-processing evidence for the
  fixed Aguada restaurant large/strategic scenario, scoped to the official DDEC
  permit-system Task Force report.
- `data/profile-reach/aguada-restaurant-inspection-window-review.json`:
  reviewed Permiso Unico inspection-accountability evidence for the fixed
  Aguada restaurant large/strategic scenario, scoped to the official DDEC
  90-day service window without claiming observed inspection throughput.
- `data/profile-reach/aguada-restaurant-large-site-screening-review.json`:
  reviewed large-site screening baseline evidence for the fixed Aguada
  restaurant scenario, scoped to official Aguada territorial-plan, Planning
  Board zoning, flood, district, and hazard sources.
- `docs/unis-geocoding-policy.md`: approved reproducible geocoding policy for
  deriving `unis.lat` and `unis.long` from registered Puerto Rico source
  addresses.
- `data/municipalities/`: source-backed planning-context municipality display-name registry.
- `data/naics/`: source-backed planning-context NAICS title registry for active fixture codes.
- `data/planning-context/`: descriptive planning-context fixtures that combine
  municipality and category selections with source-backed candidate facts.
- `data/geocoding/`: checked-in reviewed geocoding artifacts for approved
  import flows, including exclusion quarantine records and the current `unis`
  partial-import boundary review for rows that remain outside production-style
  import.
- `data/geocoding/unis-address-verification.json`: pinned Census verification
  for the 15 approved `unis` rows that remain geocoder-quarantined.
- `data/unis/identity-review.json`: row-level identity-authority exclusion
  contract for the 27 `unis` rows that remain identity-quarantined, including
  5 NCES+DAPIP+ORLIE/JIP-corroborated rows that are still not import-ready.
- `data/unis/orlie-jip-row-review.json`: bounded ORLIE/JIP public Power BI
  row-review artifact for the 5 identity-corroborated rows; it stores
  licensure-listing context only and excludes personal contact fields.
- `data/unis/albizu-staged-review.json` and
  `data/unis/sagrado-staged-review.json`: staged alias/campus and
  public-address review artifacts for two identity-corroborated rows; neither
  artifact creates Census cache rows, coordinates, generated output, or DB seed
  rows.
- `data/generated/unis-partial-import.json`: generated 4-row partial `unis`
  import slice rebuilt from the accepted Census-cache boundary by
  `node scripts/build_unis_slice.js`.
- `data/unis/partial-source-fields.json`: reviewed source fields for legacy
  `unis.desc` generation, scoped to the same 4 accepted cache-backed rows.
- `data/unis/ipeds-geocode-audit.json`: checked-in exact-match audit between
  the active higher-ed directory and Puerto Rico IPEDS coordinates.
- `data/naics/cbp-naics-titles.json`: checked-in Census title registry for all
  registered Puerto Rico CBP `naics` codes used by the approved
  `cbps.cnaic_name` import join.

## Validation Commands

`npm run build` is the root validation alias and currently runs the full root
test suite:

```sh
npm run build
npm run test
```

Use focused checks while iterating:

```sh
npm run test:browser
npm run test:browser:start-local
npm run test:business-categories
npm run test:data-sources
npm run test:deployment-config
npm run test:deployment-containers
npm run test:migration-artifacts
npm run test:naics-registry
npm run test:unis-geocode-audit
npm run test:unis-identity-review
npm run test:unis-import
npm run test:unis-public-address-review
npm run test:planning-context
npm run test:signal-review-orchestration
npm run test:signal-reviews
npm run test:decision-signals
npm run test:regulatory-signal-review
npm run test:infrastructure-signal-review
npm run test:utility-resilience-signal-review
npm run test:demand-signal-review
npm run test:island-demand-signal-review
npm run test:logistics-signal-review
npm run test:external-logistics-signal-review
npm run test:site-feasibility-signal-review
npm run test:large-site-signal-review
npm run test:routine-workforce-signal-review
npm run test:workforce-signal-review
npm run test:ecosystem-signal-review
npm run test:construction-execution-signal-review
npm run test:coordination-timing-signal-review
npm run test:inspection-window-signal-review
npm run test:profile-reach-traceability
npm run test:profile-reach-contract
```

`npm run test:profile-reach-traceability` also fails if the maintained roadmap,
product-scope, standards evidence register, and registry drift away from the
current next evidence-depth lane or if additional literal profile/reach source
gaps appear without review.

`npm run test:signal-reviews` is the stable complete signal-evidence gate. It
discovers the registry-listed reviewed artifacts, verifies a one-to-one mapping
to the preserved focused commands, runs the orchestration and decision-signal
contracts, and then runs every focused signal review in deterministic order.

Data-maintenance helpers:

```sh
npm run build:unis-import
npm run sync:unis-geocode-cache
npm run verify:unis-addresses
npm run verify:unis-identity
```

## Docker Validation

```sh
docker build -t utoplanme:modernization .
docker run --rm -p 8080:8080 utoplanme:modernization
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
```

The Docker build runs `npm run install:all` and `npm run build`, so it validates
clean installs and the API test baseline before producing an image.

CI policy lives in `docs/ci-platform-policy.md`. GitHub Actions is the required
transparent PR readiness gate and the only CI platform in the modernization
path.

`npm run docker:test:db` builds a disposable seeded Postgres image from
`Dockerfile.postgres-test`, runs the DB-backed modern API contract tests in a
current Node container, and tears the Compose stack down afterward.

The production app and modern API images run their service commands as the
unprivileged image user `node`; neither runtime requires root privileges.
All Node Docker stages also use one reviewed OCI digest. Weekly update
discovery, review ownership, validation, advisory response, and rollback are
defined in `docs/container-base-refresh.md`.

`npm run docker:test:proxy` uses the same seeded Postgres image, starts
`npm run start:local` inside the test container, and verifies `/v1/unis` is
served through the proxy from real modern API data rather than the offline
fixture.

`npm run docker:test:start-local-browser` runs Chromium against the seeded
`start:local` path and verifies the map renders modern API data without
fetching the offline fixture.

`npm run test:browser` runs a Playwright Chromium smoke test against the static
app. Run `npx playwright install chromium` once on a fresh local machine before
using it.

`npm run test:naics-registry` validates the checked-in Census title registry for
the full registered Puerto Rico CBP code set so the approved `cbps.cnaic_name`
import join does not depend on a live Census API key.

`npm run test:unis-geocode-audit` validates the checked-in Puerto Rico
higher-education coordinate audit so the current `unis` blocker stays grounded
in measured exact-match coverage rather than geocoder-only assumptions.

`npm run test:browser:start-local` runs the app, modern API, and Chromium on the
host machine against a seeded `baseline-read-v1` database. It honors explicit
`TEST_DATABASE_*` settings, otherwise provisions the disposable Compose `db`
service on a loopback host port, ignores ambient database environment variables
such as `DATABASE_URL`, and removes the service after the run. Set
`START_LOCAL_BROWSER_USE_ENV_DB=1` only when you intentionally want to reuse an
existing baseline-ready database.

The legacy Nodal API path has been retired from the normal project tree. The
modern API runs from `dtoapi/modern`, compiles TypeScript sources to ignored
CommonJS output under `dtoapi/modern/lib/`, and preserves the captured root and
seeded read endpoint contracts.

Repeat `npx playwright install chromium` after a Playwright update so the browser
matches the lockfile. Missing binaries must fail tests; do not substitute older
cached versions. CI already installs the matching runtime after workspace install
with `npx playwright install --with-deps chromium` and does not cache browsers.

Browser suites mock external tiles for deterministic checks. Before a release,
also open the app with live tiles and verify the basemap. Record provider/network
failures separately from application regressions. The basemap warning must leave
markers and available planning-context detail usable and clear after recovery.

The static app and modern API both expose `/healthz` for runtime health checks.

Use `npm run start:api:modern` to run the modern API locally on `PORT` or `3001`.

## Local App And API Flow

Run the modern API and static app as two local services when validating
integrated map data:

```sh
npm run start:local
```

To run the services manually:

```sh
PORT=3001 npm run start:api:modern
UTOPLAN_API_ORIGIN=http://127.0.0.1:3001 PORT=8080 npm run start:app
```

## API Database Environment

`dtoapi/modern/src/db.ts` reads database settings from environment variables.

Development:

```sh
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=
DATABASE_DB=dtoapi_development
```

Test:

```sh
TEST_DATABASE_HOST=localhost
TEST_DATABASE_PORT=5432
TEST_DATABASE_USER=postgres
TEST_DATABASE_PASSWORD=
TEST_DATABASE_DB=dtoapi_test
```
