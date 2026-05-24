# utoplan.Me Modernization Fork

`utoplan.Me` began as a hackathon project by Imaginary Films. This
modernization fork preserves that origin while rebuilding the project as a
roadmap and decision-support tool for business formation in Puerto Rico.

The goal is not only to show public data on a map. The goal is to help the
people behind a business endeavor understand where an idea can take root, what
local conditions affect it, and which in-situ resources can support it before,
during, and after planning.

## Product Vision

`utoplan.Me` aims to help founders, investors, planners, and local development
teams evaluate the economic potential of a business in Puerto Rico through
place-based analysis.

The tool is intended to correlate zoning, municipalities, education, workforce
signals, business density, industry patterns, infrastructure, and other local
resources so users can reason about the full lifecycle of establishing a
business:

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

## Modernization Purpose

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

- `app/`: dependency-free Node static web app and first-party browser assets.
- `dtoapi/`: modern API compatibility server and tests.
- `docs/api-modernization.md`: modern API replacement notes.
- `docs/database-migrations.md`: production database migration artifact strategy.
- `docs/data-intake.md`: Puerto Rico-only source intake contract and registry policy.
- `docs/data-provenance.md`: known evidence and open gaps for the original hackathon dataset.
- `docs/deployment-topology.md`: integrated app/API deployment topology.
- `docs/frontend-inventory.md`: static app source and asset inventory.
- `docs/modernization-roadmap.md`: modernization plan and phase gates.
- `docs/production-deployment.md`: production deployment checklist and rollback runbook.
- `docs/standards/`: active IEEE 730, 828, 829, 830, 1016, 1012, and 1058
  standards corpus plus audit guides for ongoing modernization governance.

## Root Commands

```sh
npm run build
npm run docker:build
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
npm run install:all
npm run test
npm run test:browser
npm run test:data-sources
npm run test:db
npm run test:browser:start-local
npm run start:app
npm run start:api
npm run start:api:modern
npm run start:local
```

## Docker Validation

```sh
docker build -t utoplanme:modernization .
docker run --rm -p 8080:8080 utoplanme:modernization
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
```

The Docker build runs `npm run install:all` and `npm run build`, so it validates clean installs and the API test baseline before producing an image.

`npm run docker:test:db` builds a disposable seeded Postgres image from `Dockerfile.postgres-test`, runs the DB-backed modern API contract tests in a current Node container, and tears the Compose stack down afterward.

`npm run docker:test:proxy` uses the same seeded Postgres image, starts `npm run start:local` inside the test container, and verifies `/v1/unis` is served through the proxy from real modern API data rather than the offline fixture.

`npm run docker:test:start-local-browser` runs Chromium against the seeded `start:local` path and verifies the map renders modern API data without fetching the offline fixture.

`npm run test:browser` runs a Playwright Chromium smoke test against the static app. Run `npx playwright install chromium` once on a fresh local machine before using it.

The legacy Nodal API path has been retired from the normal project tree. The modern API runs from `dtoapi/modern`, compiles TypeScript sources to ignored CommonJS output under `dtoapi/modern/lib/`, and preserves the captured root and seeded read endpoint contracts.

The static app and modern API both expose `/healthz` for runtime health checks.

Use `npm run start:api:modern` to run the modern API locally on `PORT` or `3001`.

## Local App And API Flow

Run the modern API and static app as two local services when validating integrated map data:

```sh
npm run start:local
```

`npm run start:local` starts the modern API on `UTOPLAN_API_PORT` or `3001`, starts the static app on `UTOPLAN_APP_PORT` or `8080`, and passes `UTOPLAN_API_ORIGIN` into the static app. The browser keeps using same-origin URLs such as `/v1/unis`.

To run the services manually:

```sh
PORT=3001 npm run start:api:modern
UTOPLAN_API_ORIGIN=http://127.0.0.1:3001 PORT=8080 npm run start:app
```

For explicit offline demos only, run the app with `UTOPLAN_DEMO_FIXTURE=1` to map `/v1/unis` to `app/public/data/unis.json`. Without `UTOPLAN_API_ORIGIN` or `UTOPLAN_DEMO_FIXTURE=1`, `/v1/*` paths are not handled by the static app.

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
