# Production Deployment Runbook

This runbook describes the current production deployment contract for the integrated static app and modern API topology.

## Runtime Contract

- Deploy two Node services: `app` for static assets and the same-origin `/v1/*` proxy, and `api` for the modern TypeScript API.
- Default to keeping the API private to the service network so browser traffic reaches only the app origin.
- If external consumers require direct API access, expose the API intentionally and treat it as a public surface.
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

`DATABASE_URL` must be a valid `postgres://` or `postgresql://` URL. Deployment
verification rejects other schemes and malformed values before API startup
without echoing the configured value.

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

For public API exposure, set:

```sh
UTOPLAN_API_EXPOSURE=public
UTOPLAN_PUBLIC_API_URL=https://api.example.com
```

If the API remains private, `UTOPLAN_API_EXPOSURE` may be omitted or set to `private`.

Secrets must come from the deployment platform secret store. Do not commit production credentials, generated `.env` files, or exported environment dumps.

## Preflight Checklist

Run these checks before promoting a release candidate:

```sh
npm run install:all
npm run build
npm run verify:deployment
npm run verify:release
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

`npm run verify:release-smoke` is a post-deploy gate, not a local preflight
command. Run it against the deployed candidate after the app and API readiness
checks described below; it requires `UTOPLAN_APP_URL` and optionally
`UTOPLAN_API_URL`.

`npm run verify:deployment` validates the production app/API environment in the current shell. Use `node scripts/verify_deployment_config.js --service=app` or `--service=api` when checking one container at a time.

`docker-compose.integrated.yml` runs the verifier before each service process starts. The modern API Docker image also runs `--service=api` before starting `dtoapi/modern/lib/server.js`.
The production app and API images run their service commands as the
unprivileged image user `node`; neither runtime requires root privileges.
Node base images are tag-and-digest pinned. Follow
`docs/container-base-refresh.md` for scheduled updates, security-advisory
response, validation, and rollback; do not update only a subset of Node stages.

Public API mode is accepted only when `UTOPLAN_API_EXPOSURE=public` and
`UTOPLAN_PUBLIC_API_URL` is set to a valid HTTP(S) URL.

`npm run verify:release` wraps the app and API deployment verifiers for release jobs. CI runs it with `UTOPLAN_RELEASE_SAMPLE=1` to validate wiring without production secrets; production release jobs must omit sample mode and provide real platform environment values.

After deploying a candidate release, run `npm run verify:release-smoke` with
`UTOPLAN_APP_URL` set to the public app origin. The smoke check verifies app
`/healthz`, public `/v1/unis`, and public `/v1/planning-context` through the
app origin. Set `UTOPLAN_API_URL` only when the API readiness URL is reachable
from the release job network.

Set `UTOPLAN_RELEASE_SMOKE_JSON=1` when release evidence needs a
machine-readable summary. The script still writes the human pass/fail summary
to stderr and exits nonzero on failure, while stdout contains sanitized tested
URLs, status codes, and per-check outcomes.

Confirm these release facts before deployment:

- The image or artifact was built from the intended commit.
- App and API environment variables are set in the deployment platform.
- The API database user has only the permissions required by the current read endpoint set.
- API `/readyz` is part of the platform readiness policy.
- App `/healthz` is part of the platform readiness or load balancer health policy.
- `UTOPLAN_DEMO_FIXTURE` is unset.
- If the API is public, API edge controls (auth policy, rate limiting, WAF, and request logging) are enabled and verified.

## Migration And Seed Policy

The current modern API reads the existing DTO schema. The production baseline is `baseline-read-v1`, which requires the public read tables and columns used by the modern API resource contract. This project does not yet contain a production migration runner.

Migration artifacts live under `db/migrations/`; use `docs/database-migrations.md` for the artifact format, release policy, and review checklist.

Until a migration runner is added:

- Apply schema changes outside the app deploy and record the exact database change in the release notes.
- Prefer backward-compatible schema changes before app rollout.
- Verify seeded contract behavior with `npm run docker:test:db` before touching production data.
- Keep the API `/readyz` schema status green before routing app traffic.
- Keep demo/test seed data separate from production data.
- Treat production data changes as manual operator actions that require an explicit backup and rollback note.

Do not add startup-time schema mutation to either service. Production startup should validate configuration and serve traffic, not change database shape.

## Deployment Order

1. Build and publish the API image or artifact from the release commit.
2. Build and publish the app image or artifact from the same release commit.
3. Confirm database connectivity from the target network.
4. Deploy the API with production database configuration.
5. Wait for `GET /readyz` on the API to return `200`.
6. Deploy the app with `UTOPLAN_API_ORIGIN` pointing at the API service.
7. Wait for `GET /healthz` on the app to return `200`.
8. Smoke test the public app origin and verify `/v1/unis` and
   `/v1/planning-context` are served through the app origin.
9. If the API is public, smoke test the public API URL (`/healthz` and `/readyz`) from an external client path.

Example smoke checks:

```sh
UTOPLAN_APP_URL=https://app.example.com \
UTOPLAN_API_URL=https://api.example.internal \
npm run verify:release-smoke
```

Public API example:

```sh
UTOPLAN_APP_URL=https://app.example.com \
UTOPLAN_API_URL=https://api.example.com \
npm run verify:release-smoke
```

The `/healthz` response reports service identity and app proxy state. Use it to verify the deployed app is in proxy mode, not fixture mode.

The API `/readyz` response checks database reachability and the `baseline-read-v1` schema contract. It returns `503` when the database cannot be reached or the required read schema is missing. Keep `/healthz` available for shallow process liveness checks.

## Rollback Expectations

Rollback should use the last known-good app and API artifacts from the same release pair.

Rollback immediately when:

- Either service fails readiness checks after deployment.
- The app health response shows fixture mode enabled.
- `/v1/unis` fails through the public app origin.
- `/v1/planning-context` fails through the public app origin.
- If public, direct API `/healthz` or `/readyz` fails from the external client path.
- The API logs database connection or query failures after rollout.
- Browser smoke checks show missing map data or uncaught page errors.

Rollback order:

1. Remove the app from public traffic or route traffic to the previous app artifact.
2. Restore the previous API artifact.
3. Verify API `/readyz`.
4. Verify app `/healthz`.
5. Verify `/v1/unis` and `/v1/planning-context` from the public app origin.

If a release included a production database change, follow the release-specific database rollback note before restoring app traffic. If no safe database rollback exists, keep the previous compatible application version in service and escalate the data fix separately.
