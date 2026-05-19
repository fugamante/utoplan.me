# Production Deployment Runbook

This runbook describes the current production deployment contract for the integrated static app and modern API topology.

## Runtime Contract

- Deploy two Node services: `app` for static assets and the same-origin `/v1/*` proxy, and `api` for the modern TypeScript API.
- Keep the API private to the service network. Browser traffic should reach only the app origin.
- Configure the app with `UTOPLAN_API_ORIGIN` pointing at the private API origin.
- Do not enable `UTOPLAN_DEMO_FIXTURE` in production. Fixture mode is only for explicit offline demos and tests.
- Run the API with `NODE_ENV=production` and an explicit PostgreSQL connection.

The API intentionally exits during production startup when database configuration is missing. This prevents a partial deployment that serves static assets while the API is disconnected from data.

## Required Configuration

Set one of these database configurations for the API.

Single URL:

```sh
DATABASE_URL=postgres://utoplan:replace-me@postgres.example.internal:5432/utoplan
```

Discrete fields:

```sh
DATABASE_HOST=postgres.example.internal
DATABASE_PORT=5432
DATABASE_USER=utoplan
DATABASE_PASSWORD=replace-me
DATABASE_DB=utoplan
```

Set these service values:

```sh
NODE_ENV=production
PORT=3001
UTOPLAN_API_ORIGIN=http://api:3001
```

Secrets must come from the deployment platform secret store. Do not commit production credentials, generated `.env` files, or exported environment dumps.

## Preflight Checklist

Run these checks before promoting a release candidate:

```sh
npm run install:all
npm run build
npm run verify:deployment
npm run test:browser
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:start-local-browser
npm audit
npm --prefix app audit
npm --prefix dtoapi audit
npm --prefix dtoapi/modern audit
```

Run Docker compatibility checks when Docker is available, because the production topology depends on container networking and seeded Postgres validation.

`npm run verify:deployment` validates the production app/API environment in the current shell. Use `node scripts/verify_deployment_config.js --service=app` or `--service=api` when checking one container at a time.

Confirm these release facts before deployment:

- The image or artifact was built from the intended commit.
- App and API environment variables are set in the deployment platform.
- The API database user has only the permissions required by the current read endpoint set.
- `/healthz` is part of the platform readiness or load balancer health policy for both services.
- `UTOPLAN_DEMO_FIXTURE` is unset.

## Migration And Seed Policy

The current modern API reads the existing DTO schema. This project does not yet contain a production migration runner.

Until a migration runner is added:

- Apply schema changes outside the app deploy and record the exact database change in the release notes.
- Prefer backward-compatible schema changes before app rollout.
- Verify seeded contract behavior with `npm run docker:test:db` before touching production data.
- Keep demo/test seed data separate from production data.
- Treat production data changes as manual operator actions that require an explicit backup and rollback note.

Do not add startup-time schema mutation to either service. Production startup should validate configuration and serve traffic, not change database shape.

## Deployment Order

1. Build and publish the API image or artifact from the release commit.
2. Build and publish the app image or artifact from the same release commit.
3. Confirm database connectivity from the target network.
4. Deploy the API with production database configuration.
5. Wait for `GET /healthz` on the API to return `200`.
6. Deploy the app with `UTOPLAN_API_ORIGIN` pointing at the API service.
7. Wait for `GET /healthz` on the app to return `200`.
8. Smoke test the public app origin and verify `/v1/unis` is served through the app origin.

Example smoke checks:

```sh
curl -fsS https://app.example.com/healthz
curl -fsS https://app.example.com/v1/unis
```

The `/healthz` response reports service identity and app proxy state. Use it to verify the deployed app is in proxy mode, not fixture mode.

## Rollback Expectations

Rollback should use the last known-good app and API artifacts from the same release pair.

Rollback immediately when:

- Either service fails readiness health checks after deployment.
- The app health response shows fixture mode enabled.
- `/v1/unis` fails through the public app origin.
- The API logs database connection or query failures after rollout.
- Browser smoke checks show missing map data or uncaught page errors.

Rollback order:

1. Remove the app from public traffic or route traffic to the previous app artifact.
2. Restore the previous API artifact.
3. Verify API `/healthz`.
4. Verify app `/healthz`.
5. Verify `/v1/unis` from the public app origin.

If a release included a production database change, follow the release-specific database rollback note before restoring app traffic. If no safe database rollback exists, keep the previous compatible application version in service and escalate the data fix separately.
