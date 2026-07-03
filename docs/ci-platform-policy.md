# CI Platform Policy

Review date: 2026-06-30

`utoplan.Me` uses CI as release evidence, not as decoration. A CI platform must
make failures inspectable from the repository tools used for review.

## Current Gates

- GitHub Actions workflow: `.github/workflows/ci.yml`

The workflow runs the required validation surface:

- install workspace dependencies
- run the root build and contract-test stack
- install Chromium browser dependencies
- run browser smoke tests
- run release preflight configuration checks
- run Docker DB contract tests
- run Docker `start:local` browser smoke tests

## Required Readiness Gate

GitHub Actions is the required transparent PR readiness gate and the only
CI platform in the modernization path.

Reasons:

- Job, step, command, and failure logs are available through repository-local
  GitHub tooling.
- The workflow runs on pull requests and `master` pushes.
- The workflow mirrors the existing local and Docker validation commands.
- Action dependencies are pinned by full commit SHA.

Before marking a broad PR ready for review or merging it, confirm that the
GitHub Actions `PR validation / validation` job passes for the current head
commit.

## Azure Status

Azure Pipelines is removed from the repository modernization path. Do not add
or require Azure checks for PR readiness unless the project explicitly adopts
Azure deployment, environment governance, or release promotion later.

If an external Azure DevOps integration still posts checks, treat those checks
as stale external configuration until the integration is disabled outside this
repository. Do not block readiness on Azure when GitHub Actions `validation`
passes.

## Branch Protection Recommendation

`master` should require the GitHub Actions `validation` check before merge.

Recommended protection shape:

- require pull request review before merge when more than one maintainer is
  active
- require status checks to pass before merge
- require the GitHub Actions `validation` check
- keep branches up to date when practical for the current contributor model
- do not add external CI status checks unless they are transparent and
  intentionally adopted by the project

## Failure Handling

When a CI run fails:

1. Inspect the GitHub Actions failing job and command first.
2. Reproduce the failing command locally when the failure is code-related.
3. Fix the underlying repo issue and push a normal commit.
4. Treat rerun-only or empty commits as a last resort.
5. If stale external checks appear while GitHub Actions passes, verify branch
   protection still requires only `validation` and handle the external
   integration outside the repository.
