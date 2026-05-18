# utoplan.me

Hackathon Neeuko Project by Imaginary Films.

## Project Layout

- `app/`: Express static web app.
- `dtoapi/`: Nodal API and tests.
- `docs/api-modernization.md`: modern API replacement notes.
- `docs/frontend-inventory.md`: static app source and asset inventory.
- `docs/modernization-roadmap.md`: modernization plan and phase gates.

## Root Commands

```sh
npm run build
npm run docker:build
npm run docker:test:db
npm run install:all
npm run test
npm run test:browser
npm run test:db
npm run start:app
npm run start:api
npm run start:api:modern
```

## Docker Validation

```sh
docker build -t utoplanme:modernization .
docker run --rm -p 8080:8080 utoplanme:modernization
npm run docker:test:db
```

The Docker build runs `npm run install:all` and `npm run build`, so it validates clean installs and the API test baseline before producing an image.

`npm run docker:test:db` starts a disposable Postgres container with contract seed data, runs the DB-backed API tests in a Node 8 compatibility container, and tears the Compose stack down afterward. The legacy Nodal `pg@4.5.7` driver hangs against Postgres from modern Node runtimes, so the DB contract path is intentionally isolated from the normal Node 22 build.

`npm run test:browser` runs a Playwright Chromium smoke test against the static app. Run `npx playwright install chromium` once on a fresh local machine before using it.

The API is legacy Nodal code originally aligned with Node 6/8. The current modernization baseline installs and tests successfully on newer Node versions, but the dependency stack remains deprecated and vulnerable until later phases replace or upgrade it.

Phase 5 introduces a parallel modern API compatibility entrypoint under `dtoapi/modern/`. It currently implements the DB-free root endpoint contract only; `npm run test:api` runs both the legacy Nodal contract baseline and the modern root compatibility test. Use `npm run start:api:modern` to run that modern slice locally on `PORT` or `3001`.

## API Database Environment

`dtoapi/config/db.json` reads database settings from environment variables.

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
