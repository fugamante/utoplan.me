# Puerto Rico Data Intake

This project should treat Puerto Rico as the only active data scope until the original hackathon dataset is recovered or a broader scope is explicitly approved.

## Intake Contract

Accepted source records must be listed in `data/sources/puerto-rico.json` before import work starts.

Each accepted source must record:

- Puerto Rico-only scope, or an explicit Puerto Rico filter such as Census `state:72`.
- Publisher, portal, license, source URL, and resource URL or API URL.
- Target legacy table or endpoint.
- Candidate status and a short source-basis note.
- Retrieval date at the registry level.

Do not import broad national datasets unless the registry entry includes a deterministic Puerto Rico filter and the import script enforces that filter.

Source-backed planning data must also have a provenance/confidence assessment before it is promoted beyond dry-run artifacts. The machine-readable assessment lives in `data/mappings/puerto-rico-provenance-confidence.json`.

## Current Candidate Sources

- `cbps`: Datos.PR County Business Patterns 2014 Puerto Rico CSV and municipality CSV.
- `muns`: Datos.PR official Puerto Rico municipality boundary ZIP, plus the municipality-level CBP file where only tabular join data is needed.
- `unis`: Datos.PR higher education directory for Puerto Rico, academic year 2017-18.
- `unis` coordinates: NCES EDGE postsecondary locations filtered to `STATE='PR'`.
- `cbps` fallback: Census 2014 CBP API filtered with `state:72`.

## Unresolved Legacy Tables

The legacy `cdepts`, `businesses`, and `grade_cs` tables still need source identification. They should remain blocked for production-style import until a Puerto Rico-only source, license, and transform path are recorded.

## Source Registry Validation

Run the registry contract check with:

```sh
npm run test:data-sources
```

The root `npm run test` command also runs this check.

## Schema Mapping

The current source-to-schema mapping is documented in `docs/data-schema-mapping.md` and enforced by `npm run test:data-mapping`.

## Provenance And Confidence

The current source-backed baseline covers `cbps`, `muns`, and `unis` only. These rows are candidate planning data, not production-grade facts. `cdepts`, `businesses`, and `grade_cs` remain blocked until a Puerto Rico-only source, license, scope, and transform path are recorded.

Run:

```sh
npm run test:data-provenance-confidence
```

## Municipality Boundary Planning

The official municipality boundary source is still registered as the ZIP published by Datos.PR. Dry-run planning consumes only an extracted CSV or JSON attribute table from that source and ignores geometry. The checked-in non-production example is `data/fixtures/non-production/official-municipality-boundaries-extract.csv`.

Raw ZIP/DBF ingestion remains a production hardening item; until then, cached raw ZIPs are reported as unsupported instead of being guessed or partially parsed.
