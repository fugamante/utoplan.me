# Demo Manual

This manual runs a real DB-backed local demo with Docker Postgres, the modern API, and the static app proxy. It is separate from production deployment guidance.

## Prerequisites

- Node.js with npm
- Docker
- Docker Compose

## Install

```sh
npm run install:all
```

## Validate Before Demo

```sh
npm test
npm run docker:test:modern-db
npm run docker:test:proxy
```

These checks verify the API contracts, seeded Docker Postgres behavior, and app-origin proxy behavior.

## Start The DB-Backed Demo

```sh
docker compose -f docker-compose.demo.yml up --build
```

Open:

- App: `http://127.0.0.1:8080`
- API readiness: `http://127.0.0.1:3001/readyz`
- Live planning context: `http://127.0.0.1:3001/v1/planning/context?municipality=1&category=professional_services`
- Demo session: `http://127.0.0.1:3001/v1/demo/session?session=demo-session-1`
- Proxied demo session through the app origin: `http://127.0.0.1:8080/v1/demo/session?session=demo-session-1`

The demo Postgres port is exposed on `127.0.0.1:15432`.

Connection values:

```text
host: 127.0.0.1
port: 15432
database: dtoapi_test
user: postgres
password: postgres
```

## Expected Demo Behavior

- `/healthz` on the app reports proxy mode and fixture mode disabled.
- `/readyz` on the API reports database and schema `ok`.
- `/v1/planning/context?municipality=1&category=professional_services` returns live DB context with CBP facts and no signals or scores.
- `/v1/demo/session?session=demo-session-1` returns a seeded local demo profile composed with live planning context.

## Release Smoke For Demo Environments

For a deployed demo environment that intentionally exposes seeded demo sessions:

```sh
UTOPLAN_APP_URL=http://127.0.0.1:8080 \
UTOPLAN_API_URL=http://127.0.0.1:3001 \
UTOPLAN_DEMO_SESSION_ID=demo-session-1 \
npm run verify:release-smoke
```

Production-mode API containers expose `/v1/demo/session` only when `UTOPLAN_DEMO_SESSIONS=1` is set.

## Stop And Clean Up

```sh
docker compose -f docker-compose.demo.yml down -v
```

The `-v` flag removes the seeded demo database volume.

## Current Session Limits

The current session path is a seeded local/demo read model. It is not production authentication, password login, account recovery, or long-term user storage. Treat `demo-session-1` as non-production evidence that DB-backed session composition works.
