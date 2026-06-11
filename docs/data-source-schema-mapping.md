# Puerto Rico Source To Legacy Schema Mapping

This note maps registered Puerto Rico source candidates to the preserved legacy
read schemas defined in:

- `dtoapi/modern/src/resource_contract.ts`
- `db/migrations/202605211200_baseline_read_v1.md`

The mapping in this file is evidence-backed and scoped to currently registered
`cbps` and `unis` candidates. It does not use demo fixtures or test seed data
as provenance evidence. Source-level import blockers are mirrored in
`data/sources/puerto-rico.json` under `importReadiness`.

## Evidence Snapshot (2026-06-10)

- `cbps` Puerto Rico CSV header (`cbp14pr.csv`) observed from the registered
  Datos.PR resource on 2026-06-04:
  `fipstate,naics,empflag,emp_nf,emp,...,ap,...,est,...,censtate`
- `cbps` municipality CSV header (`cbp14pr_mun.csv`) observed from the
  registered Datos.PR resource on 2026-06-04:
  `fipstate,fipscty,naics,empflag,emp_nf,emp,...,ap,est,...,censtate,cencty`
- `unis` higher-ed CSV header:
  `Nombre de la Institución,Unidad Académica,Principal Ejecutivo,Telefono,Dirección Pág Web,Correo Electrónico,Dirección Física,Dirección Física 2,Pueblo`
- `cbps` fallback Census API request returned a `Missing Key` HTML response on
  2026-06-04, so field coverage for that fallback remains documentation-backed
  but the operational fallback path is blocked until an API-key policy is
  recorded.

## Mapping Legend

- `exact`: direct field-level mapping is clear.
- `derived`: target field can be produced with deterministic transform.
- `missing`: no field-level evidence in the registered source.

## Legacy `cbps` Table Mapping

Legacy columns: `id`, `total_indus`, `total_anual`, `cnaic`, `cnaic_name`,
`county`, `num_est`, `created_at`, `updated_at`.

### datospr-cbp-2014-puerto-rico (`cbp14pr.csv`)

| Legacy column | Source field(s) | Coverage | Notes |
| --- | --- | --- | --- |
| `id` | `generated` | derived | Generated at import time. |
| `cnaic` | `naics` | exact | NAICS code is present in source header. |
| `total_anual` | `ap` | exact | Annual payroll field is present. |
| `num_est` | `est` | exact | Establishment count field is present. |
| `total_indus` | `emp` | derived | Approved transform: preserve legacy `total_indus` as the CBP employee count. This is an inference from the preserved schema plus the Census `EMP` definition, "Total Number of Employees." |
| `county` | none | missing | Puerto Rico aggregate file does not include county/municipality code. |
| `cnaic_name` | none | missing | Source header does not include NAICS title text. |
| `created_at` | `generated` | derived | Generated at import time. |
| `updated_at` | `generated` | derived | Generated at import time. |

### datospr-cbp-2014-municipios (`cbp14pr_mun.csv`)

| Legacy column | Source field(s) | Coverage | Notes |
| --- | --- | --- | --- |
| `id` | `generated` | derived | Generated at import time. |
| `cnaic` | `naics` | exact | NAICS code is present in source header. |
| `total_anual` | `ap` | exact | Annual payroll field is present. |
| `num_est` | `est` | exact | Establishment count field is present. |
| `county` | `fipscty` | exact | Municipality/county-equivalent code is present. |
| `total_indus` | `emp` | derived | Approved transform: preserve legacy `total_indus` as the CBP employee count. This is an inference from the preserved schema plus the Census `EMP` definition, "Total Number of Employees." |
| `cnaic_name` | none | missing | Source header does not include NAICS title text. |
| `created_at` | `generated` | derived | Generated at import time. |
| `updated_at` | `generated` | derived | Generated at import time. |

### Approved `cnaic_name` Strategy For Datos.PR CBP CSV Imports

The Datos.PR CBP CSV candidates remain the preferred Puerto Rico business
pattern inputs, but both omit title text for the preserved `cnaic_name`
column. The approved production-style strategy is:

1. Use the CSV `naics` field as the primary code.
2. Join it to the registered fallback Census CBP reference source
   `census-cbp-2014-state-72-fallback` on exact 2012 NAICS code text
   (`naics -> NAICS2012`) after trim-only normalization.
3. Populate `cnaic_name` from the fallback reference field `NAICS2012_TTL`.

Control notes:

- This is an approved auxiliary-source join strategy, not a permission to use
  planning-context fixture titles as import evidence.
- `data/naics/planning-context-naics-titles.json` remains fixture-only and does
  not satisfy production import provenance for `cbps.cnaic_name`.
- `data/naics/cbp-naics-titles.json` is the approved checked-in Census title
  artifact for this join. Rebuild it with `node scripts/sync_naics_registry.js`
  when the registered Puerto Rico CBP source snapshot changes.

### census-cbp-2014-state-72-fallback (API)

The fallback API currently requests:
`ESTAB,PAYANN,NAICS2012,NAICS2012_TTL`.

This covers `num_est`, `total_anual`, `cnaic`, and `cnaic_name` directly.
`county` is available from `for=county:*` in the request path. `total_indus`
still needs an explicit transform decision because the selected API fields do
not include an unambiguous `total_indus` alias. As of 2026-06-04, the live API
request also requires a Census API key, so this path is not an anonymous
operator fallback anymore.

## Legacy `unis` Table Mapping

Legacy columns: `id`, `title`, `address`, `desc`, `lat`, `long`, `created_at`,
`updated_at`.

### datospr-higher-ed-directory-2017-18

| Legacy column | Source field(s) | Coverage | Notes |
| --- | --- | --- | --- |
| `id` | `generated` | derived | Generated at import time. |
| `title` | `Nombre de la Institución` | exact | Institution name field is present. |
| `address` | `Dirección Física`, `Dirección Física 2`, `Pueblo` | derived | Deterministic concatenation is possible. |
| `desc` | `Unidad Académica`, `Principal Ejecutivo` | derived | Approved transform: join present fields as labeled text in source order, e.g. `Academic unit: <value>; Principal executive: <value>`. |
| `lat` | `Dirección Física`, `Dirección Física 2`, `Pueblo` | derived | Approved transform: build a normalized Puerto Rico single-line address and derive latitude from reviewed Census geocoder response field `y`. |
| `long` | `Dirección Física`, `Dirección Física 2`, `Pueblo` | derived | Approved transform: build a normalized Puerto Rico single-line address and derive longitude from reviewed Census geocoder response field `x`. |
| `created_at` | `generated` | derived | Generated at import time. |
| `updated_at` | `generated` | derived | Generated at import time. |

## Blocking Notes

- `cbps`: the `total_indus -> emp` transform and the `cnaic_name` auxiliary
  join strategy are now approved for the Datos.PR CBP CSV candidates, and the
  checked-in Census title artifact now provides the reproducible access path for
  `cnaic_name`.
- `unis`: the geocoding policy for `lat`/`long` is now approved and pinned in
  `docs/unis-geocoding-policy.md`, with checked-in cache storage at
  `data/geocoding/unis-census-geocoder-cache.json` and paired quarantine
  storage at `data/geocoding/unis-import-quarantine.json`. `unis` import
  readiness must remain blocked until the reviewed Census cache contains
  Puerto Rico matches for rows with exact source-backed identity evidence and
  the quarantine artifact records the remaining excluded rows. The stricter
  11-of-57 IPEDS exact-match baseline at `data/unis/ipeds-geocode-audit.json`
  now acts as a hard trust boundary rather than a starting point for alias or
  campus promotion.
- `cbps` fallback API: operator use is blocked until a Census API key source,
  storage path, and rotation policy are recorded.
- `cdepts`, `businesses`, and `grade_cs` remain blocked in the source registry
  due to missing source and transform provenance.
