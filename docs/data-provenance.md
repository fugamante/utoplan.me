# Data Provenance

This note records what is known about the original hackathon data sources and what is still missing.

## Verified Repository Evidence

The pre-modernization history does not include a dataset package, CSV export, SQL dump, or README note naming the event organizer or the exact organizer-provided dataset.

The old `master` snapshot does preserve these source clues:

- `README.md` described the project as `Hackathon Neeuko Project Imaginary FIlms`.
- `app/public/js/map.js` called `http://api.utoplan.me/v1/unis`.
- `app/index.html` called `http://api.utoplan.me/v1/cbps`.
- `app/public/index.js` experimented with `http://api.census.gov/data/2014/acs5?`.
- `app/public/js/map.js` included a commented Universia Puerto Rico XML URL: `http://www.universia.pr/maps/resultadoPR.xml`.
- The original DTO API schema defined read resources for `unis`, `muns`, `cbps`, `cdepts`, `businesses`, and `grade_cs`.

## Confirmed External Attribution

External public material identifies Utoplan.me as a project from the 2016 Puerto Rico Cuenta Hackaton:

- Javier Cordero's public resume lists `2do Lugar en Puerto Rico Cuenta Hackaton 2016`, credits the U.S. Census Bureau, and describes Utoplan.me as a prototype using data from the Census Bureau and the Instituto de Estadisticas de PR.
- News coverage for the October 8-9, 2016 hackathon says the event aimed to use local open datasets from the Instituto de Estadisticas de Puerto Rico, Census Bureau APIs, and the City Software Development Kit.
- The Instituto de Estadisticas press release for `Puerto Rico Cuenta` says the hackathon used Census data and was held at the Universidad del Sagrado Corazon collaborative innovation center.

These sources identify the likely organizers and data providers, but they do not name the exact file bundle imported into the old `api.utoplan.me` database.

## Current Interpretation

The repository preserves the shape of the data contract, not the provenance of the original dataset. Based on table names, endpoint names, and source URLs, the hackathon data appears to cover:

- Puerto Rico universities.
- Municipalities or county-style geography.
- County Business Patterns / NAICS business data.
- Career or department mappings.
- Graduation or university-to-career relationship data.

The strongest source matches found so far are:

- `cbps`: likely U.S. Census Bureau 2014 County Business Patterns. The legacy columns map closely to Census variables such as `ESTAB` for establishments, `PAYANN` for annual payroll, `NAICS2012`, `NAICS2012_TTL`, and `COUNTY`.
- `unis`: likely derived from a Puerto Rico higher education directory and/or the old Universia Puerto Rico XML endpoint. The current Datos.PR higher education directory is public domain but was created after the 2016 hackathon, so it is a replacement-source candidate, not confirmed original input.
- `muns`: likely Puerto Rico municipality/county-equivalent reference data from Census or Instituto de Estadisticas sources.
- `cdepts`, `businesses`, and `grade_cs`: likely transformed or manually joined planning data that connected NAICS/career areas, business locations, universities, and graduation rates. No public source file has been confirmed for these tables.

The `api.utoplan.me` host no longer resolves, and this pass did not recover archived API responses. Treat all row-level data from the original API as unrecovered.

## Stronger `unis` Authority Stack (2026-06-11)

The current `unis` modernization path should not rely on the Datos.PR directory
plus a single auxiliary IPEDS-style audit as the long-term institution
authority for Puerto Rico.

Higher-authority sources identified in this pass:

- The Puerto Rico Department of State Office of Registration and Licensing
  (ORLIE) now oversees postsecondary institution licensure under Law 212-2018
  and links the official postsecondary institution listing surface.
- NCES College Navigator provides a Puerto Rico state selector and spreadsheet
  export for institution search results.
- The U.S. Department of Education accreditation search provides a Puerto Rico
  state filter for accredited postsecondary institutions and programs.

Practical implication:

- Treat the Datos.PR directory as the working Puerto Rico row source.
- Treat NCES and U.S. Department of Education as corroboration sources for
  institution identity and accreditation review.
- Treat the Puerto Rico Department of State ORLIE/JIP surface as a licensure
  corroboration source. As of 2026-06-26, the bounded five-row review contract is
  checked in at `data/unis/orlie-jip-row-review.json`, but it remains
  corroboration-only and not a direct row-import source.

Registry implication:

- Keep the NCES and U.S. Department of Education Puerto Rico-filtered
  corroboration entries registered while the `unis` import path remains blocked
  on stronger institution authority.
- Do not treat those corroboration entries as direct `unis` row sources or as
  a substitute for the approved Census geocoder cache/quarantine workflow.
- Treat the Puerto Rico Department of State ORLIE/JIP surface as a reproducible
  bounded review source for the five checked rows, with explicit operator
  handling and no import or coordinate authority.

## `unis` Authority Stack Review (2026-06-23)

This pass rechecked the current authority-source surfaces before any additional
row promotion work.

Findings:

- The Puerto Rico Department of State ORLIE page is an official `.pr.gov`
  source. It states that Law 212-2018 created the Junta de Instituciones
  Postsecundarias (JIP), that ORLIE supports the Secretary and JIP, and that
  ORLIE handles licensing processes for higher-education and postsecondary
  technical-vocational institutions in Puerto Rico.
- The ORLIE page links a public Power BI report for `Instituciones de
  Educacion Postsecundaria`. This is enough to register ORLIE/JIP as a
  licensure corroboration surface, but this pass did not verify a stable CSV,
  API, or bulk export contract from that report.
- A later 2026-06-26 row-level pass identified the report's public Power BI
  metadata/schema/query endpoints as a bounded review contract for the five
  NCES+DAPIP-corroborated identity rows. That contract is checked in at
  `data/unis/orlie-jip-row-review.json`; it remains corroboration-only and does
  not create import, coordinate, or public-address authority.
- NCES College Navigator remains a reproducible federal corroboration surface:
  the Puerto Rico search is addressable at `?s=PR`, and the current CSV export
  endpoint is `https://nces.ed.gov/collegenavigator/default.aspx?s=PR&xp=2`.
- U.S. Department of Education DAPIP remains a federal accreditation
  corroboration surface. It can corroborate accreditation status under a Puerto
  Rico state search, but it is not a coordinate authority and not a replacement
  row source for the preserved `unis` table.

Practical implication:

- Register ORLIE/JIP as `unis-licensure` corroboration.
- Keep NCES as `unis-identity` corroboration and DAPIP as
  `unis-accreditation` corroboration.
- Keep all three sources out of the direct `unis` import path until row-level
  authority decisions are reviewed and recorded.
- Keep `unis` import readiness blocked because the Census geocoder cache only
  contains a reviewed subset of the approved alias/campus rows, with the rest
  still excluded until a partial-import boundary or corrected address evidence
  is accepted.

## Product Mapping Snapshot (2026-05-26)

The first product-facing category contract now lives in
`data/mappings/puerto-rico-business-categories.json`. It maps candidate
business categories to 2012 NAICS codes so future planning context can select
source-backed CBP facts by municipality and industry.

This crosswalk is not original hackathon provenance and is not production
decision logic. It is a candidate product artifact that requires human review
before production use and must remain descriptive until source-backed facts,
confidence labels, and limitations are visible.

## Municipality Label Snapshot (2026-06-03)

`data/municipalities/planning-context-municipalities.json` now records the
active planning-context fixture municipality display names from the official
Puerto Rico municipality boundary dataset published through Datos.PR. The
current registry only covers the municipality codes used by the fixture set and
does not yet establish a full import-ready municipality table.

## NAICS Title Snapshot (2026-06-03)

`data/naics/planning-context-naics-titles.json` now records source-backed
NAICS title text for the active planning-context fixture codes. This registry
is intentionally narrow: it uses the fallback Census CBP `NAICS2012_TTL`
mapping as the authoritative field reference and stores exact titles for the
currently exposed fixture codes so the API/UI can show deterministic industry
labels even when the municipality CSV omits `cnaic_name`.

## Planning Context Provenance Snapshot (2026-06-26)

The planning-context API now returns a derived `sourceProvenance` detail view
from each fixture's checked-in `sourceMetadata`. The browser panel renders the
source publisher, portal, source id, and retrieval date next to confidence,
limitations, and unresolved questions.

This does not change the candidate status of the planning-context fixtures and
does not accept a partial `unis` import boundary. It makes the existing
descriptive CBP context more production-usable by keeping visible facts tied to
registered source evidence.

## Legacy Schema Mapping Snapshot (2026-06-04)

Field-level mapping evidence for registered Puerto Rico candidates now exists
for `cbps` and `unis` in `docs/data-source-schema-mapping.md`.

Current status:

- `cbps`: source-header evidence supports direct mapping for `cnaic`,
  `total_anual`, and `num_est`; municipality CSV also supports `county`.
  Import-generated fields are now documented explicitly. The Datos.PR CSV
  candidates now adopt `total_indus -> emp` as an evidence-backed preserved
  employee-count transform. `cnaic_name` now has an approved source strategy:
  join CSV `naics` to the registered fallback Census CBP title reference on
  exact NAICS 2012 code and read `NAICS2012_TTL`, without treating the
  planning-context title registry as import evidence. Execution remained
  blocked at this snapshot until that auxiliary title reference had a
  reproducible operator path.
- `unis`: source-header evidence supports `title` and a deterministic
  `address` transform, and import-generated fields are documented explicitly.
  The `desc` field now has a deterministic labeled-text transform, but no
  coordinate fields are present for `lat`/`long`. Geocoding policy remains a
  blocking decision for import readiness, and the registry records that blocker
  separately from the mapping evidence.
- `cbps` fallback API: the documented Census fallback fields still align with
  legacy columns, but a live request on 2026-06-04 returned a `Missing Key`
  response. Treat that fallback as operator-blocked until an API-key policy is
  recorded; the registry now carries that operational blocker explicitly.

## Import Title Registry Snapshot (2026-06-10)

`data/naics/cbp-naics-titles.json` now records checked-in Census title text for
all 1,772 distinct `naics` codes observed in the registered Puerto Rico CBP
CSV candidates. It is generated from the official Census
`naics-descriptions/naics2012.txt` reference plus the registered Datos.PR CBP
code set through `node scripts/sync_naics_registry.js`.

This registry is the approved production-style auxiliary join artifact for
`cbps.cnaic_name`. It removes the municipality-level `cbps` import blocker
without relying on the live Census API or the narrower planning-context title
fixture registry.

## `unis` Geocoding Policy Snapshot (2026-06-10)

`docs/unis-geocoding-policy.md` now records the approved reproducible geocoding
policy for deriving preserved `unis.lat` and `unis.long` values from the
registered Puerto Rico higher-education directory.

Current control:

- Provider is the U.S. Census Geocoding Services API with pinned
  `Public_AR_Census2020` benchmark and `Census2020_Census2020` vintage
  settings.
- Input address construction is deterministic and Puerto Rico-scoped.
- Reviewed results are expected to be stored in the checked-in cache artifact
  `data/geocoding/unis-census-geocoder-cache.json`.
- Excluded rows are expected to be recorded in the paired checked-in quarantine
  artifact `data/geocoding/unis-import-quarantine.json`.
- Rows without reviewed Puerto Rico matches remain excluded from
  production-style import rather than receiving invented coordinates.

## `unis` Census Geocoder Cache Snapshot (2026-06-23)

`node scripts/sync_unis_census_geocoder_cache.js` now rebuilds the checked-in
Census geocoder cache from the reviewed alias/campus approval artifact.

Current status:

- The corrected Census 2020 vintage pair is `Public_AR_Census2020` plus
  `Census2020_Census2020`.
- 4 of the 19 approved alias/campus rows returned reviewed Puerto Rico Census
  geocoder matches and are recorded in
  `data/geocoding/unis-census-geocoder-cache.json`.
- `data/geocoding/unis-public-address-review.json` now records the row-level
  public-address review for the 16 approved rows that originally failed the
  pinned Census path; 1 row was promoted into the reviewed cache. The checked-
  in board now also distinguishes active versus stale or unverified locations
  and records the exact official candidate address tested under the pinned
  Census contract.
- 15 approved alias/campus rows still did not return reviewed Puerto Rico
  geocoder matches under the pinned request contract and are recorded as
  geocoder-specific exclusions in
  `data/geocoding/unis-import-quarantine.json`.
- The 27 identity-quarantined rows remain excluded and are now covered by the
  row-level identity-review contract in `data/unis/identity-review.json`; 5
  rows have NCES identity/campus, DAPIP accreditation, and ORLIE/JIP
  licensure-listing corroboration, while 22 still lack row-level authority
  corroboration.
- `data/unis/albizu-staged-review.json` and
  `data/unis/sagrado-staged-review.json` record the two
  NCES+DAPIP+ORLIE/JIP-corroborated rows with staged alias/campus and
  public-address evidence. These staged artifacts are not cache artifacts and
  do not create coordinates, generated rows, DB seed rows, API coverage, or UI
  coverage.
- `data/geocoding/unis-import-boundary-review.json` records the current MAX
  decision board. The implemented boundary accepts partial import only from
  the 4 cache-backed rows; the corrected-address and identity-review artifacts
  keep all remaining reviewed exclusions outside generated output.
- `unis` full readiness stays blocked until corrected address evidence or
  row-level authority evidence changes the current exclusion contracts.

## `unis` Coordinate Audit Snapshot (2026-06-11)

`data/unis/ipeds-geocode-audit.json` now records the first reproducible
exact-match audit against the Puerto Rico IPEDS postsecondary dataset already
published on Datos.PR.

Current status:

- Exact normalized institution-name plus municipality matching covers 11 of 57
  rows from the active `datospr-higher-ed-directory-2017-18` source.
- 46 rows remain unmatched without reviewed alias expansion, campus handling,
  or manual overrides.
- The `unis` import path therefore remains blocked on a reviewed match policy
  and quarantine rule rather than on a lack of candidate coordinate evidence.

## `unis` Alias/Campus Review Policy Snapshot (2026-06-11)

`docs/unis-alias-campus-match-policy.md` now records the approved review gate
for promoting unmatched directory rows beyond the strict exact-match audit.

Current control:

- No fuzzy matching, parent-system coordinate borrowing, or invented fallback
  coordinates are permitted.
- Reviewed outcomes must be recorded row by row in
  `data/unis/ipeds-alias-campus-review.json`.
- Only reviewed `approved-alias` or `approved-campus` rows may advance into
  the checked-in Census cache workflow; the rest remain quarantined.

## `unis` Alias/Campus Review Snapshot (2026-06-11)

The first checked-in review pass now records row-level outcomes in
`data/unis/ipeds-alias-campus-review.json`.

Current status:

- 19 unmatched rows now have reviewed `approved-alias` or `approved-campus`
  outcomes backed by address, translation, campus, or explicit parenthetical
  evidence in the registered sources.
- 4 approved rows now have reviewed Puerto Rico Census cache records.
- 15 approved rows remain excluded because the pinned Census verification in
  `data/geocoding/unis-address-verification.json` found zero promotion-eligible
  rows.
- 27 rows remain identity-quarantined in the paired
  `data/geocoding/unis-import-quarantine.json` and are covered by
  `data/unis/identity-review.json`.
- The `unis` import path remains blocked on the stronger institution-authority
  stack and on corrected address evidence that could change the current
  zero-promotion verification result.

## `unis` Import Boundary Review Snapshot (2026-06-26)

The reviewed partial Census cache is now accepted as a narrow production-style
import boundary. Only the 4 cache-backed rows may be generated through this
boundary; the 15 approved geocoder-quarantined rows and the 27 identity-
quarantined rows remain excluded.

Operational slice:

- Rebuild command: `node scripts/build_unis_slice.js`
- Generated JSON: `data/generated/unis-partial-import.json`
- Generated seed: `docker/postgres/002_unis_partial_seed.sql`
- Source-field input for legacy detail fields:
  `data/unis/partial-source-fields.json`
- Corrected-address verification for the remaining approved rows:
  `data/geocoding/unis-address-verification.json`
- Identity-authority exclusion review for the remaining identity-quarantined
  rows: `data/unis/identity-review.json`
- The generated seed populates `desc` only from the checked-in source-field
  artifact for the 4 accepted rows. Quarantined rows cannot contribute detail
  fields or generated output.

Decision board outcome:

- Partial cache import boundary: accepted with explicit API/UI coverage
  language.
- Corrected address evidence: the reviewed row-level public-address pass and
  pinned verification artifact are checked in; all 15 remaining approved rows
  stay geocoder-quarantined with zero promotion-eligible rows.
- Identity quarantine review: implemented as a reviewed-excluded row-level
  contract in `data/unis/identity-review.json`; 5 rows have NCES
  identity/campus, DAPIP accreditation, and ORLIE/JIP licensure-listing
  corroboration from `data/unis/orlie-jip-row-review.json`; 22 rows still lack
  row-level authority corroboration, and zero rows are identity-promoted or
  generated-output eligible.
- Corroborated identity follow-up review: implemented through
  `data/unis/corroborated-identity-followup-review.json`,
  `data/unis/albizu-staged-review.json`, and
  `data/unis/sagrado-staged-review.json`; Albizu and Sagrado have staged
  alias/campus and public-address evidence but still have zero cache,
  coordinate, import, or generated-output eligibility.
- Contract hardening: implemented through
  `data/geocoding/unis-import-boundary-review.json` and
  `npm run test:data-sources`.
- Generated-slice hardening: implemented through `npm run test:unis-import`.
- Source-backed detail hardening: implemented through exact artifact/cache
  alignment checks in `npm run test:unis-import` and
  `npm run test:data-sources`.
- Corrected-address hardening: implemented through
  `data/geocoding/unis-address-verification.json`,
  `npm run verify:unis-addresses`, and
  `npm run test:unis-public-address-review`.
- Identity-review hardening: implemented through
  `data/unis/identity-review.json`, `npm run verify:unis-identity`, and
  `npm run test:unis-identity-review`.

Invariants:

- The 4 reviewed cache rows are the only accepted partial production-style
  `unis` subset.
- The partial subset is not complete Puerto Rico higher-education coverage.
- Excluded rows remain outside production-style output until corrected address
  evidence or row-level authority review changes their status.
- Identity-authority review is not coordinate evidence and is not import
  readiness by itself.

## External Logistics Snapshot (2026-08-13)

`data/profile-reach/aguada-restaurant-external-logistics-review.json` now
records the first reviewed external-connection logistics baseline for the fixed
large/strategic Aguada restaurant scenario.

Current status:

- The reviewed source uses the official Puerto Rico Institute of Statistics
  cargo inventory reported from Puerto Rico Ports Authority facilities.
- The bounded evidence establishes that west-region airport cargo gateways in
  Aguadilla and Mayaguez are active, measured external-connection surfaces in
  official Puerto Rico reporting.
- The external logistics lane is no longer a pure source gap in the
  profile/reach matrix; it is now a descriptive gateway baseline only.
- Supplier depth, cold-chain timing, maritime dependency, backup sourcing,
  recovery time, and one operator's procurement resilience remain explicit
  unresolved limits.
- Legacy detail fields remain scoped to the checked-in source-field artifact
  and the accepted 4-row boundary.

## Provenance Gap

Before production use, public release, or broad data refresh work, identify and record:

- The original organizer-provided dataset name.
- The organizer or institution that supplied it.
- License and reuse terms.
- Original files, schema, or API references.
- Transformation steps from source data into the API tables.
- Whether any values are synthetic, manually edited, or test-only.

Until then, test seed data and offline fixtures must remain clearly separated from production data.

## Source Links

- Javier Cordero resume: `https://javiercordero.info/wp-content/uploads/2018/05/Resum%C3%A9-Javier-Cordero-2018-actualizado.pdf`
- News is My Business hackathon coverage: `https://newsismybusiness.com/es/participa-en-el-proximo-hackathon/`
- Instituto de Estadisticas press release: `https://estadisticas.pr/files/Comunicados/prensa/comunicados/comunicado_20161010.pdf`
- Census 2014 County Business Patterns API: `https://www.census.gov/data/developers/data-sets/cbp-zbp/cbp-api.2014.html`
- Datos.PR higher education directory candidate: `https://datos.estadisticas.pr/dataset/directorio-de-instituciones-de-educacion-superior-puerto-rico`
