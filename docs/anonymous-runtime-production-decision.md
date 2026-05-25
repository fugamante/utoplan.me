# Anonymous Runtime Production Decision

Anonymous session/profile activation requires a reviewed production-decision package. Environment validation alone is not approval to activate the runtime.

## Required Package

Store real decision artifacts with release evidence, not in the public repository. The machine-readable contract is `data/mappings/anonymous-runtime-production-decision-contract.json`; validate a decision artifact with:

```sh
npm run validate:anonymous-runtime-decision -- --decision=runtime-decision.json --out=decision-validation.json
```

The package must include:

- `runtime-decision.json`: target environment, public app origin, selected limiter mode, runtime gate values, and neutral operator decision label.
- `deployment-evidence.json`: topology evidence showing browser traffic reaches the public app or edge first, the API is private, Postgres is private, and `/v1/*` is same-origin through the app proxy.
- `migration-evidence.json`: anonymous storage migration status, shared limiter migration status when shared mode is selected, anonymous schema readiness, and unchanged `baseline-read-v1` readiness.
- `limiter-evidence.json`: selected `shared` or `edge` mode, approved limiter scopes, fail-closed behavior, and platform policy evidence for edge mode.
- `proxy-evidence.json`: proof that forwarding headers are stripped at the public boundary and one trusted client IP signal is injected before private API access.
- `smoke-evidence.json`: release smoke, opt-in anonymous smoke, and negative CORS/CSRF smoke results against the candidate public app origin.
- `backup-restore-evidence.json`: backup identifier, backup timestamp, restore procedure location, and review status.
- `rollback-evidence.json`: activation-gate disablement, shared/edge limiter fallback, no destructive rollback after production writes, and reviewed data-preserving rollback path.
- `operator-approval.json`: neutral role/team approval with required acknowledgements and no secrets or personal identifiers.
- `operator-approval-validation.json`: output from the validator.

## Hosting Topology

The required production shape is:

```text
Browser -> public app or deployment edge -> private API -> private PostgreSQL
```

The API must not be directly reachable from the public internet. The local anonymous runtime smoke stack is the compatibility model for shared mode because it exposes only the app to the host while keeping the trusted-proxy API and Postgres private inside the Compose network. It is not a production deployment definition.

`docker-compose.demo.yml` is demo/test-only and is not acceptable topology evidence for anonymous production activation because it exposes API and Postgres ports for local inspection.

## Limiter Decision

Choose `shared` when all public anonymous traffic reaches the private API through a trusted app proxy or private edge and all API instances can coordinate through the same Postgres `anonymous_rate_limit_buckets` table.

Choose `edge` only when the deployment edge enforces the approved anonymous limiter scopes before requests can reach the API. `UTOPLAN_ANONYMOUS_EDGE_RATE_LIMIT=1` is an operator attestation, not evidence by itself; the decision package must include platform policy evidence.

Do not use process-local limiting for public or multi-instance anonymous runtime.

## Verification Boundary

`npm run verify:deployment` and `npm run verify:release` check environment shape only. They cannot prove header stripping, private API exposure, edge policy, migration application, or smoke results. The production-decision package must provide those release artifacts before `UTOPLAN_ANONYMOUS_RUNTIME=1` is enabled for public traffic.

## Rollback

The first rollback control is disabling `UTOPLAN_ANONYMOUS_RUNTIME` or routing traffic to a compatible release where anonymous routes are fail-closed.

After production anonymous writes exist, do not drop `anonymous_sessions`, `anonymous_planning_profiles`, or `anonymous_profile_events`. Preserve rows and use a reviewed data-preserving rollback or retention fix. Drop `anonymous_rate_limit_buckets` only after shared limiter traffic is disabled or moved to an approved edge-limited release and the limiter counter reset is accepted.
