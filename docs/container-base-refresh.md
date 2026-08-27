# Container Base Refresh Control

All Node Docker stages use the reviewed Node 26 Bookworm Slim tag plus one OCI
index digest. The digest makes a commit reproducible; the tag keeps runtime
intent visible.

GitHub Dependabot checks Docker dependencies weekly. The modernization
maintainer owns review, validation, merge, and urgent advisory response.
Updates are never auto-merged. This control becomes operational when the
configuration reaches the default branch and the first generated Docker PR
passes validation.

## Normal Refresh

1. Confirm every Node `FROM` stage moves to the same proposed digest.
2. Update the expected digest in `test/deployment_container_contract_test.js`.
3. Review official Node image and Debian security/release evidence.
4. Build and inspect both production images, run host and Docker validation,
   and merge only after PR checks pass.
5. Record accepted evidence in the IEEE 828 audit corpus.

## Security Advisory Response

Do not wait for the weekly window for a relevant Node or Debian advisory.
Prepare or trigger the update, run the normal validation, and document any
unfixed exposure, compensating control, owner, and next review time.

## Validation

```sh
npm run test:deployment-containers
UTOPLAN_RELEASE_SAMPLE=1 npm run verify:release
docker build -t utoplanme:base-refresh-app .
docker build -f Dockerfile.modern-api -t utoplanme:base-refresh-api .
docker image inspect utoplanme:base-refresh-app utoplanme:base-refresh-api
npm run test
npm run docker:test:all-db
```

Production app and API images must retain user `node`, and all stable contracts
must pass.

## Rollback

Revert to the last accepted digest and redeploy the last known-good app/API
artifact pair. Do not combine a digest rollback with a runtime-major, Debian
variant, command, or runtime-user change.

## Revisit Triggers

Revisit for a Node support or Debian variant change, a new Dockerfile, a CI or
ownership change, a failed refresh, or a relevant security advisory.
