# CI Platform Policy

Review date: 2026-06-30

`utoplan.Me` uses CI as release evidence, not as decoration. A CI platform must
make failures inspectable from the repository tools used for review.

## Current Gates

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Azure Pipelines workflow: `azure-pipelines.yml`

Both workflows run the same validation surface:

- install workspace dependencies
- run the root build and contract-test stack
- install Chromium browser dependencies
- run browser smoke tests
- run release preflight configuration checks
- run Docker DB contract tests
- run Docker `start:local` browser smoke tests

## Required Readiness Gate

GitHub Actions is the required transparent PR readiness gate.

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

Azure Pipelines may continue to run as an advisory compatibility signal.

Azure is not the authoritative readiness gate unless its logs are accessible to
the reviewer or operator performing the readiness pass. If Azure fails and only
reports a generic Bash exit annotation without step logs, do not guess. Use the
transparent GitHub Actions result and the local validation surface to decide
whether the failure is actionable or platform-specific.

If Azure is kept as a required merge gate, the project must first make Azure
logs inspectable from the normal review workflow.

## Branch Protection Recommendation

`master` should require the GitHub Actions `validation` check before merge.
Azure should not be required until its logs are available to operators who are
expected to fix failures.

Recommended protection shape:

- require pull request review before merge when more than one maintainer is
  active
- require status checks to pass before merge
- require the GitHub Actions `validation` check
- keep branches up to date when practical for the current contributor model
- do not require Azure as a blocking check unless log access is fixed

## Failure Handling

When a CI run fails:

1. Inspect the GitHub Actions failing job and command first.
2. Reproduce the failing command locally when the failure is code-related.
3. Fix the underlying repo issue and push a normal commit.
4. Treat rerun-only or empty commits as a last resort.
5. If Azure fails but GitHub Actions passes, record Azure as advisory unless
   its logs identify a repo-owned failure.
