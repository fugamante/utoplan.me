# utoplan.me

Hackathon Neeuko Project by Imaginary Films.

## Project Layout

- `app/`: dependency-free Node static web app and first-party browser assets.
- `dtoapi/`: modern API compatibility server and tests.
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

`npm run docker:test:db` builds a disposable seeded Postgres image from `Dockerfile.postgres-test`, runs the DB-backed modern API contract tests in a current Node container, and tears the Compose stack down afterward.

`npm run test:browser` runs a Playwright Chromium smoke test against the static app. Run `npx playwright install chromium` once on a fresh local machine before using it.

The legacy Nodal API path has been retired from the normal project tree. The modern API runs from `dtoapi/modern`, compiles TypeScript sources to ignored CommonJS output under `dtoapi/modern/lib/`, and preserves the captured root and seeded read endpoint contracts.

Use `npm run start:api:modern` to run the modern API locally on `PORT` or `3001`.

## Local App And API Flow

Run the modern API and static app as two local services when validating integrated map data:

```sh
PORT=3001 npm run start:api:modern
UTOPLAN_API_ORIGIN=http://127.0.0.1:3001 PORT=8080 npm run start:app
```

With `UTOPLAN_API_ORIGIN` set, the static app proxies `/v1/*` requests to the modern API and the browser keeps using same-origin URLs such as `/v1/unis`. Without `UTOPLAN_API_ORIGIN`, the static app keeps the offline `/v1/unis` fixture fallback for standalone demos and browser smoke tests.

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
