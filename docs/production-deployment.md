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

## Trusted Client Identity

The API is private behind the app service or deployment edge, so public clients must not be able to send trusted rate-limit identity headers directly to the API. Public boundaries must strip inbound `Forwarded`, `X-Forwarded-For`, `X-Real-IP`, and platform-specific client IP headers before injecting the deployment-controlled client IP signal used by private services.

When anonymous session/profile runtime endpoints are enabled, rate-limit keys must use:

- direct socket address only when the request reaches the API without a trusted proxy
- the first `X-Forwarded-For` hop only when the immediate upstream is the trusted app proxy or edge
- `X-Real-IP` only as a trusted-proxy fallback when `X-Forwarded-For` is absent
- `unknown` only as a fail-closed condition for mutating anonymous routes

Do not enable public anonymous profile writes unless the deployed proxy/edge behavior is documented in release notes and covered by a smoke or platform check. The process-local limiter is unit-test-only and reserved-route scaffolding; shared runtime mode uses the Postgres-backed `anonymous_rate_limit_buckets` table, while edge runtime mode relies on deployment-edge enforcement before requests reach the API.

Reserved anonymous runtime activation uses `UTOPLAN_ANONYMOUS_RUNTIME=1`, `UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS`, and `UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE=shared` or `edge`. Edge mode also requires `UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT=1`, which is an operator attestation that the deployment edge enforces the approved anonymous rate-limit scopes before requests reach the API. Shared mode requires `UTOPLAN_TRUST_PROXY=1` plus `UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT=1`, the anonymous session/profile migration, and the shared limiter migration `db/migrations/202605241200_add_anonymous_rate_limit_buckets.md`. Handlers are mounted behind this fail-closed gate; public success behavior is reachable only when anonymous schema readiness, explicit limiter attestation, proxy evidence, and endpoint tests are all satisfied.

## Preflight Checklist

Run these checks before promoting a release candidate:

```sh
npm run install:all
npm run build
npm run verify:deployment
npm run verify:release
npm run test:release-smoke
npm run test:browser
npm run docker:test:db
npm run docker:test:proxy
npm run docker:test:anonymous-runtime
npm run docker:test:start-local-browser
npm audit
npm --prefix app audit
npm --prefix dtoapi audit
npm --prefix dtoapi/modern audit
```

Run Docker compatibility checks when Docker is available, because the production topology depends on container networking and seeded Postgres validation. CI runs the Docker checks sequentially with distinct Compose project names so container/network names do not collide.

`npm run docker:test:anonymous-runtime` uses a disposable Compose stack that exposes only the app on `127.0.0.1:18084`; the trusted-proxy API and Postgres stay private inside the Compose network. It applies the anonymous storage plus shared limiter schema to a throwaway database and runs opt-in anonymous rejection plus create/read/update/delete release smoke checks through the app origin.

`npm run verify:deployment` validates the production app/API environment in the current shell. Use `node scripts/verify_deployment_config.js --service=app` or `--service=api` when checking one container at a time.

`docker-compose.integrated.yml` runs the verifier before each service process starts. The modern API Docker image also runs `--service=api` before starting `dtoapi/modern/lib/server.js`.

`npm run verify:release` wraps the app and API deployment verifiers for release jobs. CI runs it with `UTOPLAN_RELEASE_SAMPLE=1` to validate wiring without production secrets; production release jobs must omit sample mode and provide real platform environment values.

After deploying a candidate release, run `npm run verify:release-smoke` with `UTOPLAN_APP_URL` set to the public app origin. Set `UTOPLAN_API_URL` only when the API readiness URL is reachable from the release job network. For a demo environment that intentionally exposes seeded DB-backed demo sessions, set `UTOPLAN_DEMO_SESSION_ID=demo-session-1` for the smoke run and enable the API endpoint with `UTOPLAN_DEMO_SESSIONS=1`. For an anonymous-runtime candidate, set `UTOPLAN_ANONYMOUS_SMOKE=1`; this performs a same-origin anonymous create/read/update/delete flow through the app origin and should run only after the anonymous storage migration, schema readiness gate, and edge/shared limiter contract are active.

Confirm these release facts before deployment:

- The image or artifact was built from the intended commit.
- App and API environment variables are set in the deployment platform.
- The API database user has only the permissions required by the current read endpoint set.
- API `/readyz` is part of the platform readiness policy.
- App `/healthz` is part of the platform readiness or load balancer health policy.
- `UTOPLAN_DEMO_FIXTURE` is unset.

## Migration And Seed Policy

The current modern API reads the existing DTO schema plus the additive `demo_sessions` table required by the local/demo session endpoint while that endpoint is active. The production baseline is `baseline-read-v1`, which requires the public read tables, columns used by the modern API resource contract, and the demo session table added by `db/migrations/202605240900_add_demo_sessions.md`. This project does not yet contain a production migration runner.

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
8. Smoke test the public app origin and verify `/v1/unis` plus `/v1/planning/context-demo` are served through the app origin. Demo environments should also verify `/v1/demo/session?session=demo-session-1`. Anonymous-runtime candidates should also run the opt-in anonymous create/read/update/delete smoke.

Example smoke checks:

```sh
UTOPLAN_APP_URL=https://app.example.com \
UTOPLAN_API_URL=https://api.example.internal \
npm run verify:release-smoke
```

Demo smoke check:

```sh
UTOPLAN_APP_URL=https://app.example.com \
UTOPLAN_API_URL=https://api.example.internal \
UTOPLAN_DEMO_SESSION_ID=demo-session-1 \
npm run verify:release-smoke
```

Anonymous runtime smoke check:

```sh
UTOPLAN_APP_URL=https://app.example.com \
UTOPLAN_API_URL=https://api.example.internal \
UTOPLAN_ANONYMOUS_SMOKE=1 \
npm run verify:release-smoke
```

The `/healthz` response reports service identity and app proxy state. Use it to verify the deployed app is in proxy mode, not fixture mode.

The API `/readyz` response checks database reachability and the `baseline-read-v1` schema contract. It returns `503` when the database cannot be reached or the required read schema is missing. Keep `/healthz` available for shallow process liveness checks.

`/readyz` also reports advisory load-policy index visibility through `loadPolicyIndexes` and `missingLoadPolicyIndexes`. These fields are not part of the current read-only readiness gate; they show whether the natural-key indexes required by a future data writer are present.

## Rollback Expectations

Rollback should use the last known-good app and API artifacts from the same release pair.

Rollback immediately when:

- Either service fails readiness checks after deployment.
- The app health response shows fixture mode enabled.
- `/v1/unis` or `/v1/planning/context-demo` fails through the public app origin.
- A demo release has `UTOPLAN_DEMO_SESSIONS=1` but `/v1/demo/session?session=demo-session-1` fails through the public app origin.
- The API logs database connection or query failures after rollout.
- Browser smoke checks show missing map data or uncaught page errors.

Rollback order:

1. Remove the app from public traffic or route traffic to the previous app artifact.
2. Restore the previous API artifact.
3. Verify API `/readyz`.
4. Verify app `/healthz`.
5. Verify `/v1/unis` and `/v1/planning/context-demo` from the public app origin.
6. For demo releases, verify `/v1/demo/session?session=demo-session-1` or disable `UTOPLAN_DEMO_SESSIONS`.

If a release included a production database change, follow the release-specific database rollback note before restoring app traffic. If no safe database rollback exists, keep the previous compatible application version in service and escalate the data fix separately.
