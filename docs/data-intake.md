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
