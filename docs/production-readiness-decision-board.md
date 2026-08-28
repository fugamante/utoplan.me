# Production Readiness Decision Board

Review date: 2026-07-05

Scope: MAX reconciliation pass for the current dirty worktree. The goal is to
decide whether the modified and untracked files form a coherent release-ready
planning-context and partial-`unis` production-readiness bundle, without
expanding the 4-row reviewed Census-cache-backed `unis` slice.

| Candidate | Repo authority / evidence | User impact | Production-readiness impact | Risk | Decision | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Keep the current dirty worktree as one coherent bundle after classification | The changed files cluster around planning-context candidate-state/provenance surfacing, partial `unis` coverage visibility, Albizu/Sagrado staged evidence, Sagrado read-only geocoder candidate evidence, Docker readiness scripts, docs, and matching tests. | Users get clearer descriptive planning context and clearer partial university coverage language without new recommendation behavior. | Highest leverage because API, UI, data-contract artifacts, docs, and tests now reinforce the same partial/readiness story. | The index has mixed staged and unstaged changes, so commit prep must normalize staging before public history. | Accept | Coherent bundle; no suspicious drift found after classification. |
| Split planning-context UI/API surfacing from staged `unis` evidence before release | The planning-context and `unis` changes are logically separable, but docs and browser tests intentionally connect them on the first screen. | Could reduce review size but would leave first-screen readiness language split across passes. | Lower immediate release leverage because partial coverage and candidate-state surfacing are validated together in browser checks. | More merge overhead and higher chance of docs/tests describing a state not present in code. | Reject | Keep as one release-readiness bundle. |
| Revert unowned changes and keep only the last browser-test hardening edit | Full validation passes with the broader bundle, and artifacts/tests consistently preserve the 4-row boundary. | Would remove useful source-backed context and make the worktree less complete. | Lowers readiness by discarding already-machine-checked data/source and UI contract hardening. | Could accidentally undo user or prior-pass work. | Reject | Do not revert without explicit user instruction. |
| Expand staged Albizu or Sagrado evidence into generated/imported `unis` output | Generated slice, SQL seed, import-boundary artifact, staged reviews, and tests all keep staged rows cache-blocked and generated-output-ineligible. | Would add rows before reviewed Census-cache evidence exists. | Violates the accepted partial-boundary contract. | High overclaiming risk: staged public-address evidence could be mistaken for coordinate/import authority. | Reject | The generated/imported `unis` slice remains limited to 4 rows. |

Selected path: keep the current changes as one coherent release-readiness bundle
and prepare it for commit review by classifying every changed file group. The
only commit-prep issue found is mixed staging, not source, product, or contract
drift.

## Worktree Classification

| Category | Files | Decision |
| --- | --- | --- |
| Product/UI contract | `app/public/index.html`, `app/public/css/main.css`, `app/public/src/map.ts`, `app/public/js/map.js`, `app/public/src/planning_context.ts`, `app/public/js/planning_context.js` | Intentional: surfaces partial `unis` limitation and planning-context candidate status, freshness, source count, and provenance. |
| API contract | `dtoapi/modern/src/planning_context.ts` | Intentional: exposes planning-context `sourceCount` consistently in summary/detail payloads. |
| Data/source artifacts | `data/unis/albizu-staged-review.json`, `data/unis/sagrado-staged-review.json`, `data/geocoding/sagrado-geocoder-candidate-review.json`, `data/unis/corroborated-identity-followup-review.json`, `data/geocoding/unis-import-boundary-review.json`, `data/sources/puerto-rico.json` | Intentional: records Albizu/Sagrado staged evidence and Sagrado no-match read-only candidate evidence while keeping zero cache/import/coordinate/generated eligibility. |
| Validation-supporting tests | `app/test/planning_context_contract_test.js`, `app/test/static_smoke_test.js`, `dtoapi/modern/test/planning_context_test.js`, `dtoapi/test/modern_root_contract_test.js`, `test/browser_smoke_test.js`, `test/start_local_browser_test.js`, `test/data_source_registry_test.js`, `test/unis_identity_review_test.js`, `test/unis_import_test.js`, `test/unis_public_address_review_test.js` | Intentional: machine-checks source/provenance visibility, partial coverage language, staged-row exclusion, and better integrated-browser diagnostics. |
| Deployment/readiness scripts | `package.json` | Intentional: starts the seeded Docker database before each DB/proxy/browser container test and tears it down after each run. |
| Documentation | `README.md`, `docs/api-modernization.md`, `docs/data-intake.md`, `docs/data-provenance.md`, `docs/data-source-schema-mapping.md`, `docs/modernization-roadmap.md`, `docs/product-scope.md`, `docs/unis-alias-campus-match-policy.md`, `docs/unis-geocoding-policy.md`, `docs/production-readiness-decision-board.md` | Intentional: documents the same API/UI/data boundary and staged-evidence limitations. |
| Generated/imported output | `data/generated/unis-partial-import.json`, `docker/postgres/002_unis_partial_seed.sql` | Unchanged: confirms no generated/imported `unis` expansion. |
| Suspicious or unrelated drift | None found | No revert recommended. |
| Commit-prep hygiene | Mixed staged/unstaged index state | Normalize staging before commit so the public commit contains the complete coherent bundle. |

Invariants:

- The product remains descriptive-only.
- The accepted partial `unis` boundary remains limited to 4 reviewed
  Census-cache-backed rows.
- Albizu and Sagrado staged evidence does not create Census cache records,
  coordinates, generated rows, DB seed rows, API coverage, or UI coverage.
- The 15 geocoder-quarantined rows and 27 identity-quarantined rows remain
  excluded from generated output, DB seed, API collections, and map markers.
- Planning-context detail must expose candidate status, source provenance,
  limitations, and unresolved questions when facts are rendered.
- No rankings, recommendations, scores, suitability claims, legal conclusions,
  zoning conclusions, finance conclusions, demand/profitability claims,
  invented coordinates, or unsupported institutional facts are introduced.
