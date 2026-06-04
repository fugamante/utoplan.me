# Puerto Rico Source To Legacy Schema Mapping

This note maps registered Puerto Rico source candidates to the preserved legacy
read schemas defined in:

- `dtoapi/modern/src/resource_contract.ts`
- `db/migrations/202605211200_baseline_read_v1.md`

The mapping in this file is evidence-backed and scoped to currently registered
`cbps` and `unis` candidates. It does not use demo fixtures or test seed data
as provenance evidence.

## Evidence Snapshot (2026-06-04)

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
| `total_indus` | `emp` | derived | Candidate mapping to employment count; requires import decision because legacy name is ambiguous. |
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
| `total_indus` | `emp` | derived | Candidate mapping to employment count; requires import decision because legacy name is ambiguous. |
| `cnaic_name` | none | missing | Source header does not include NAICS title text. |
| `created_at` | `generated` | derived | Generated at import time. |
| `updated_at` | `generated` | derived | Generated at import time. |

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
| `desc` | `Unidad Académica`, `Principal Ejecutivo` | derived | Requires deterministic format decision. |
| `lat`, `long` | none | missing | No coordinate fields in source header; geocoding policy needed. |
| `created_at` | `generated` | derived | Generated at import time. |
| `updated_at` | `generated` | derived | Generated at import time. |

## Blocking Notes

- `cbps`: promoting a source to import-ready still requires an explicit
  transform decision for `total_indus` and a strategy for `cnaic_name` where
  absent.
- `unis`: import readiness is blocked on a reproducible geocoding policy for
  `lat`/`long` and a deterministic `desc` transform.
- `cbps` fallback API: operator use is blocked until a Census API key source,
  storage path, and rotation policy are recorded.
- `cdepts`, `businesses`, and `grade_cs` remain blocked in the source registry
  due to missing source and transform provenance.
