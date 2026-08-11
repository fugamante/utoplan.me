# Container Base Refresh Control

## Control

All Node-based Docker stages use the reviewed Node 26 Bookworm Slim tag plus
one shared OCI index digest. The PostgreSQL contract-test image likewise uses
the reviewed PostgreSQL 16 Alpine tag plus an OCI index digest. The tags keep
the intended runtime lines legible; the digests make a build of a given commit
reproducible across supported platforms.

GitHub Dependabot owns weekly discovery of Docker base-image updates through
`.github/dependabot.yml`. The modernization maintainer owns review, validation,
merge, and urgent advisory response. Automated discovery does not authorize
automatic merge.

This control becomes operational only when `.github/dependabot.yml` is present
on the repository default branch and GitHub dependency automation is enabled.
The first generated Docker refresh pull request is activation evidence; until
then, local configuration and contract checks prove implementation readiness,
not end-to-end operation.

## Normal Refresh

1. Dependabot checks Docker dependencies each Monday at 09:00
   `America/Puerto_Rico` and opens at most one Docker update pull request.
2. Confirm every Node `FROM` instruction resolves to the same proposed digest
   and remains on `node:26-bookworm-slim`.
3. For a PostgreSQL image refresh, confirm `Dockerfile.postgres-test` remains
   on `postgres:16-alpine` and resolves to the reviewed OCI index digest.
4. Update the expected digest in
   `test/deployment_container_contract_test.js` in the same change. A failing
   contract is an intentional review gate, not a reason to weaken the check.
5. Review the relevant upstream Node or PostgreSQL image release and security
   notes for runtime-major, base-distribution, package, or compatibility impact.
6. Run the validation stack below. Merge only when all required checks pass or
   a documented risk acceptance names the skipped environment-dependent gate.
7. Record the accepted digest and validation evidence in the IEEE 828 audit
   corpus when the refresh changes risk, procedure, or compatibility evidence.

## Security Advisory Response

For a relevant Node or Debian base-image advisory, the modernization maintainer
does not wait for the weekly window. Trigger or prepare the Docker dependency
update, review the fixed image evidence, run the same validation stack, and
release through the normal preflight and smoke controls. If no fixed image is
available, record exposure, compensating controls, owner area, and the next
review time in the IEEE 730 and 828 audit records.

## Validation

```sh
npm run test:deployment-containers
npm run verify:release
docker build -t utoplanme:base-refresh-app .
docker build -f Dockerfile.modern-api -t utoplanme:base-refresh-api .
docker image inspect utoplanme:base-refresh-app --format '{{.Config.User}} {{json .Config.Cmd}}'
docker image inspect utoplanme:base-refresh-api --format '{{.Config.User}} {{json .Config.Cmd}}'
npm run test
```

Required results:

- Every Node stage uses the reviewed tag and identical digest.
- Production app and API images build successfully.
- Production image users remain `node`.
- Stable app, API, data, migration, deployment, and release contracts pass.

DB, proxy, and browser Docker compatibility checks remain required in the
normal CI workflow. Run them locally when the refresh changes observed runtime
behavior or when CI evidence is unavailable.

## Rollback

If validation or release smoke fails after a refresh, revert the digest update
and redeploy the last accepted app/API artifact pair. Do not change the tag,
runtime major, Debian variant, service command, or runtime-user control as part
of a digest-only rollback. Preserve failure evidence and reopen the refresh
only after the incompatibility or upstream issue is understood.

## Revisit Triggers

Revisit this control when Node 26 or PostgreSQL 16 support changes, a base
distribution changes, Dependabot ownership or scheduling changes, a
production/test Dockerfile is added, the CI Docker surface changes, or a
relevant security advisory requires faster response.
