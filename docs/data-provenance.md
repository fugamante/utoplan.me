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

## Blocked Source Review

The modernization branch now records a reviewed blocker matrix at `data/mappings/puerto-rico-blocked-source-review.json`.

Summary:

- `cdepts` remains blocked because CBP can provide Puerto Rico NAICS values but not the career-department semantics or preserved joins required by the legacy schema.
- `businesses` remains blocked because reviewed public candidates do not supply business title, physical address, point coordinates, and a defensible `cdepts`/NAICS join together.
- `grade_cs` remains blocked because IPEDS and College Scorecard-style sources are CIP-based adjacent sources, while the preserved table needs university-to-career-department rate by year.

Adjacent sources should be modeled in new planning-specific contracts if they become useful. They should not be forced into these preserved legacy tables without source-backed join evidence.

The `api.utoplan.me` host no longer resolves, and this pass did not recover archived API responses. Treat all row-level data from the original API as unrecovered.

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
