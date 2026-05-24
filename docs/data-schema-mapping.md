# Puerto Rico Data Schema Mapping

This note maps the registered Puerto Rico source candidates to the preserved legacy read schema. It intentionally stops before import scripting.

The machine-readable contract lives in `data/mappings/puerto-rico-schema-map.json`.

## Mapping Status

- `cbps`: partial. The Datos.PR 2014 municipality County Business Patterns CSV maps `ap`, `est`, `naics`, and municipality FIPS fields to most legacy columns. Census 2014 CBP metadata confirms `NAICS2012_TTL` as the NAICS title field, but row queries require an API key in this environment. `total_indus` still needs confirmation before import.
- `unis`: partial. The Datos.PR higher education directory maps institution name and address fields. NCES EDGE postsecondary locations, filtered to Puerto Rico with `STATE='PR'`, can supply `LAT` and `LON` after a deterministic name/address join is defined.
- `muns`: partial. The official municipality boundary ZIP is the preferred source; DBF inspection confirmed `municipio`, `countyfp`, `cntyidfp`, and `statefp` fields.
- `cdepts`, `businesses`, and `grade_cs`: blocked. No confirmed Puerto Rico-only source or transform path has been identified.

## Import Preconditions

Before writing import scripts:

- Confirm whether legacy `cbps.total_indus` should store employment count or another business-pattern metric.
- Provide a Census API key or cached NAICS title reference for `cbps.cnaic_name` enrichment.
- Filter current-schema imports to numeric NAICS values, or define a schema migration before preserving aggregate NAICS placeholders such as `------` and `23----`.
- Define the municipality code normalization from `countyfp` / `cntyidfp` / `fipscty` / `cencty` into the legacy integer `muns.county` and `cbps.county` fields.
- Define the deterministic join from Datos.PR higher education directory rows to NCES EDGE coordinate rows.

Before promoting source-backed rows to API/UI planning use:

- Attach row-level provenance from `data/mappings/puerto-rico-provenance-confidence.json`.
- Keep `sourceConfidence`, `transformConfidence`, `productionReadiness`, and `sourceBacked` visible in dry-run evidence.
- Treat `candidate-needs-review` rows as planning candidates, not production-grade facts.
- Keep required promotion blockers visible until release evidence explicitly resolves or waives them.

## Validation

Run:

```sh
npm run test:data-mapping
```

The root `npm run test` command also runs this check.

Run provenance/confidence validation with:

```sh
npm run test:data-provenance-confidence
```

## Business Category Crosswalk

`data/mappings/puerto-rico-business-categories.json` defines the first curated
BusinessCategory-to-NAICS crosswalk for planning context. It is a draft product
mapping that can filter CBP facts by business idea, not a scoring model or
recommendation engine.

Run category validation with:

```sh
npm run test:data-business-categories
```

## Planning Context Fixture

`scripts/planning_context.js` builds a fixture-backed planning context from a
selected municipality, a business category, and CBP rows. It emits explicit
facts, confidence, unresolved questions, and suggested next checks. It does not
create scores, ranks, or recommendation language.

Run:

```sh
npm run plan:context -- --fixture=data/fixtures/non-production/planning-context-fixture.json
npm run test:planning-context
```

## Normalization Rules

Import normalization rules are documented in `docs/data-normalization.md` and enforced by `npm run test:data-normalization`.
