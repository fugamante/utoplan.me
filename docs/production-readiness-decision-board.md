# Production Readiness Decision Board

Review date: 2026-06-26

Scope: MAX pass operationalizing ORLIE/JIP row-level corroboration for the 5
NCES+DAPIP-corroborated `unis` rows that remain identity-quarantined. The
product boundary remains descriptive-only.

| Candidate | Repo authority / evidence | User impact | Production-readiness impact | Risk | Decision | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Add ORLIE/JIP row-level corroboration for the 5 NCES+DAPIP rows where a stable public row-level source/export/API can be checked in or reproduced | The Department of State ORLIE page links the public Power BI postsecondary listing. The report exposes a reproducible public metadata/schema/query path with resource key `2393e952-ae43-401c-9c03-fbae9ff20b5f`, entity `Instituciones`, and a bounded table query that returns all 5 target rows. The captured row-review artifact is `data/unis/orlie-jip-row-review.json`. | Gives operators a clearer authority stack for the five identity candidates without changing the visible 4-row university layer. | Highest-leverage safe step because the ORLIE/JIP licensure-listing evidence is now machine-checked alongside NCES and DAPIP while remaining non-import-ready. | Power BI is a public listing surface, not the primary row source, not a coordinate authority, and not a public-address correction workflow. | Accept | ORLIE/JIP corroboration recorded for 5 rows; all 27 identity rows remain excluded from generated/imported output. |
| Keep ORLIE/JIP unresolved and document why the public Power BI/listing path is not stable enough | Previous identity artifact kept ORLIE/JIP unresolved because no stable query contract had been identified. | Lowest data-change risk. | Leaves available row-level licensure-listing corroboration unused after the query contract was verified. | Would understate the current authority evidence for five rows. | Reject | Superseded by the checked-in ORLIE/JIP row-review artifact. |
| Add a reproducible ORLIE/JIP evidence-capture workflow without changing row classifications | The query contract, report/model ids, reviewed fields, excluded fields, and five matched rows are checked into `data/unis/orlie-jip-row-review.json`. | Makes future review repeatable and privacy-aware by excluding personal contact fields from the captured artifact. | Useful companion to row corroboration because tests now validate the ORLIE source contract and identity-review join. | A capture artifact without row classification changes could look disconnected from the readiness blocker. | Include | Source contract and row evidence are checked in and consumed by the identity-review generator. |
| Defer ORLIE/JIP and harden excluded-row validation further | Generated-slice, registry, and identity tests already block quarantined rows from output. | Lowest immediate disruption. | Leaves the last reviewed authority-source gap unresolved for the five-row subset. | Future work could confuse NCES+DAPIP and NCES+DAPIP+ORLIE/JIP states. | Reject | Superseded by NCES+DAPIP+ORLIE/JIP exclusion contract. |

Selected path: record ORLIE/JIP licensure-listing corroboration for the five
existing NCES+DAPIP identity rows, keep all 27 identity-quarantined rows
excluded, and harden tests so NCES+DAPIP+ORLIE/JIP corroboration cannot be
mistaken for generated-output eligibility, coordinate authority, public-address
correction, or full `unis` readiness. The generated 4-row JSON artifact and SQL
seed remain unchanged.

Invariants:

- `unis` import readiness is `partial`, not full `ready`.
- Census cache rows are the only generated partial production-style subset.
- Geocoder-quarantined and identity-quarantined rows remain excluded from
  production-style output.
- API/UI coverage language must state that coverage is partial.
- The generated slice must be rebuilt with `node scripts/build_unis_slice.js`.
- `desc` may be populated only from non-personal fields in
  `data/unis/partial-source-fields.json` rows that exactly match the accepted
  cache-backed subset.
- NCES identity/campus, DAPIP accreditation, and ORLIE/JIP licensure-listing
  corroboration do not replace the primary Datos.PR row source, do not provide
  coordinate authority, and do not resolve alias/campus, public-address, or
  Census-cache gates.
- ORLIE/JIP listing addresses are corroboration context only unless separately
  reviewed in the public-address artifact.
- Identity-quarantined rows require row-level authority evidence, accepted
  alias/campus review, reviewed public-address evidence, and a reviewed Puerto
  Rico Census cache match before generated-output eligibility can change.
- No rankings, recommendations, scores, suitability claims, legal conclusions,
  zoning conclusions, finance conclusions, demand/profitability claims,
  invented coordinates, or unsupported institutional facts are introduced.
