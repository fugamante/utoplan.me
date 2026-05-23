# Deployment Topology

## Services

- `app`: serves the static frontend and proxies same-origin `/v1/*` requests.
- `api`: runs the modern TypeScript API from `dtoapi/modern`.
- Database: PostgreSQL reachable by the API through environment variables.

## Request Flow

```text
Browser -> app:8080 -> /v1/* proxy -> api:3001 -> PostgreSQL
Browser -> app:8080 -> static assets
```

The browser should only need the app origin. The static app receives `UTOPLAN_API_ORIGIN=http://api:3001`, so `/v1/unis` remains same-origin in browser code while the server-side proxy forwards the request to the API service.

## Compose Baseline

`docker-compose.integrated.yml` defines the app/API topology without bundling a production database. Provide the database connection through environment variables:

```sh
DATABASE_HOST=postgres.example.internal \
DATABASE_PORT=5432 \
DATABASE_USER=utoplan \
DATABASE_PASSWORD=replace-me \
DATABASE_DB=utoplan \
docker compose -f docker-compose.integrated.yml up --build
```

The app is exposed on `http://127.0.0.1:8080` by default. The API is only exposed inside the Compose network.

Both services expose `/healthz` for shallow process health. The API also exposes `/readyz`, which checks database reachability and the read-schema contract. The response includes advisory load-policy index status for future writer prerequisites, but those indexes do not change the current read-only readiness gate. The Compose baseline waits for API readiness before starting the app and marks the app healthy only after its own `/healthz` responds.

The API container fails fast in production when neither `DATABASE_URL` nor `DATABASE_HOST`, `DATABASE_USER`, and `DATABASE_DB` are configured.

Use `docs/production-deployment.md` for the production operator runbook, including secret configuration, release checks, migration expectations, and rollback triggers.

## Fixture Policy

Fixture mode is not part of the integrated deployment path. `UTOPLAN_DEMO_FIXTURE=1` is reserved for explicit offline demos and tests.
