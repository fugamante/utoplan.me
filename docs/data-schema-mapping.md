# Puerto Rico Data Schema Mapping

This note maps the registered Puerto Rico source candidates to the preserved legacy read schema. It intentionally stops before import scripting.

The machine-readable contract lives in `data/mappings/puerto-rico-schema-map.json`.

## Mapping Status

- `cbps`: partial. The Datos.PR 2014 municipality County Business Patterns CSV maps `ap`, `est`, `naics`, and municipality FIPS fields to most legacy columns. `cnaic_name` still needs NAICS title enrichment, and `total_indus` needs confirmation before import.
- `unis`: partial. The Datos.PR higher education directory maps institution name and address fields, but sampled headers do not include latitude or longitude.
- `muns`: partial. The official municipality boundary ZIP is the preferred source, but the DBF field names still need inspection before choosing the municipality title field.
- `cdepts`, `businesses`, and `grade_cs`: blocked. No confirmed Puerto Rico-only source or transform path has been identified.

## Import Preconditions

Before writing import scripts:

- Confirm whether legacy `cbps.total_indus` should store employment count or another business-pattern metric.
- Add or identify a NAICS title source for `cbps.cnaic_name`.
- Decide whether the legacy `cbps.cnaic` integer column can safely represent aggregate NAICS placeholders such as `------` and `23----`; otherwise define a schema migration before importing.
- Inspect `municipios.dbf` from the official boundary ZIP and record the field selected for `muns.title`.
- Identify a Puerto Rico-only coordinate source or geocoding policy for `unis.lat` and `unis.long`.

## Validation

Run:

```sh
npm run test:data-mapping
```

The root `npm run test` command also runs this check.
