# API Reference

This document describes every HTTP API exposed by the active `utoplan.Me`
runtime. It is derived from the TypeScript server under `dtoapi/modern/src/`,
the static application server in `app/app.js`, and the contract tests. The
retired Nodal implementation is not part of the supported API.

## Service Topology

The normal integrated deployment has two HTTP services:

- **Static app:** listens on `UTOPLAN_APP_PORT` or `8080`. It exposes its own
  `/healthz` endpoint and proxies same-origin `/v1/*` requests to the API when
  `UTOPLAN_API_ORIGIN` is configured.
- **Modern API:** listens on `PORT` or `3001`. It exposes operational endpoints,
  PostgreSQL-backed compatibility resources, and file-backed planning context.

Start both services locally with:

```sh
npm run start:local
```

The examples below assume the API is available at `http://127.0.0.1:3001`.
When using the integrated app, replace that origin with the app origin (normally
`http://127.0.0.1:8080`) for `/v1/*` requests.

## Protocol Conventions

### Methods and route parameters

- Public data endpoints support `GET` and `OPTIONS` only.
- `OPTIONS` is accepted for every API pathname and returns `204 No Content`.
- Numeric record routes accept only unsigned decimal IDs matching `[0-9]+`.
- Planning-context IDs match `[a-z0-9]+(?:[_-][a-z0-9]+)*`.
- There is no authentication, pagination, filtering, sorting, or request body.
- Query parameters are not interpreted by the current API.

### Headers

Every JSON response includes:

```text
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Powered-By: utoplan-modern-api
```

The advertised CORS methods preserve the legacy compatibility surface; known
data routes still reject methods other than `GET` and `OPTIONS` with `405`.
Sending `Accept-Encoding: gzip` enables gzip compression and adds
`Content-Encoding: gzip`.

### Standard data envelope

The root and `/v1/*` data endpoints use this shape:

```json
{
  "meta": {
    "total": 1,
    "count": 1,
    "offset": 0,
    "error": null
  },
  "data": [
    {}
  ]
}
```

`total` and `count` both mean the number of records in the current response;
they are not independent pagination values. `offset` is always `0`. Record
lookups also return an array: it contains one object when found and is empty
when absent.

Errors on data routes preserve the same envelope:

```json
{
  "meta": {
    "total": 0,
    "count": 0,
    "offset": 0,
    "error": "Not Found"
  },
  "data": []
}
```

## Operational Endpoints

### `GET /`

Legacy-compatible root response. It does not access PostgreSQL.

**Response:** `200 OK`

```json
{
  "meta": {
    "total": 1,
    "count": 1,
    "offset": 0,
    "error": null
  },
  "data": [
    {
      "message": "Welcome to your Nodal Project"
    }
  ]
}
```

### `GET /healthz`

Process liveness check. It does not verify database connectivity or schema.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "service": "utoplan-modern-api"
}
```

### `GET /readyz`

Readiness check. It queries `information_schema.columns` and verifies that all
required compatibility tables and columns match schema version
`baseline-read-v1`.

**Ready response:** `200 OK`

```json
{
  "status": "ok",
  "service": "utoplan-modern-api",
  "database": "ok",
  "schema": "ok",
  "schemaVersion": "baseline-read-v1"
}
```

**Unavailable database response:** `503 Service Unavailable`

```json
{
  "status": "error",
  "service": "utoplan-modern-api",
  "database": "unavailable",
  "schema": "unknown",
  "schemaVersion": null
}
```

If PostgreSQL is reachable but its schema is incomplete, `database` is `ok`,
`schema` is `unavailable`, and `schemaVersion` is `baseline-read-v1`.

## Database Resource Endpoints

Each resource exposes a collection and a numeric record lookup:

| Resource | Collection | Record | PostgreSQL table |
| --- | --- | --- | --- |
| Universities | `GET /v1/unis` | `GET /v1/unis/{id}` | `unis` |
| Municipalities | `GET /v1/muns` | `GET /v1/muns/{id}` | `muns` |
| Business categories | `GET /v1/cdepts` | `GET /v1/cdepts/{id}` | `cdepts` |
| County business patterns | `GET /v1/cbps` | `GET /v1/cbps/{id}` | `cbps` |
| Businesses | `GET /v1/busines` | `GET /v1/busines/{id}` | `businesses` |
| Graduation/category records | `GET /v1/grace_cs` | `GET /v1/grace_cs/{id}` | `grade_cs` |

`busines` and `grace_cs` are intentional legacy-compatible URL spellings; the
underlying tables are `businesses` and `grade_cs`.

Collection responses are ordered by ascending `id`. Record lookups use exact
integer equality. A missing record returns `404` with `meta.error: null` and an
empty `data` array; a path that does not match a supported route returns `404`
with `meta.error: "Not Found"`.

### Resource fields

Fields are serialized in the order shown and are not renamed:

| Resource | Fields |
| --- | --- |
| `unis` | `id`, `title`, `address`, `desc`, `lat`, `long`, `created_at`, `updated_at` |
| `muns` | `id`, `title`, `county`, `created_at`, `updated_at` |
| `cdepts` | `id`, `cnaic`, `created_at`, `updated_at` |
| `cbps` | `id`, `total_indus`, `total_anual`, `cnaic`, `cnaic_name`, `county`, `num_est`, `created_at`, `updated_at` |
| `busines` | `id`, `cdepts_id`, `lat`, `long`, `title`, `address`, `created_at`, `updated_at` |
| `grace_cs` | `id`, `uni_id`, `cdepts_id`, `rate`, `year`, `created_at`, `updated_at` |

Database columns other than `id` are nullable in the baseline schema. IDs and
foreign-key-like fields are numbers. `lat`, `long`, `total_indus`, and
`total_anual` are numbers. `rate` and `year` are strings for compatibility.
PostgreSQL timestamps serialize as JSON date-time strings through the `pg`
driver.

### `unis` coverage metadata

The `GET /v1/unis` collection is a reviewed partial import, not complete Puerto
Rico higher-education coverage. Its response adds `meta.coverage`; the other
collections and all record lookups do not.

```json
{
  "sourceId": "datospr-higher-ed-directory-2017-18",
  "status": "partial",
  "boundaryDecision": "accept-partial-import",
  "coverageLabel": "Partial reviewed Census-cache coverage: 4 included rows, 42 reviewed exclusions.",
  "reviewedCacheRows": 4,
  "approvedRows": 19,
  "geocoderQuarantinedApprovedRows": 15,
  "identityQuarantinedRows": 27,
  "reviewedRowsAccountedFor": 46,
  "includedRows": 4,
  "excludedRows": 42,
  "cacheArtifactPath": "data/geocoding/unis-census-geocoder-cache.json",
  "quarantineArtifactPath": "data/geocoding/unis-import-quarantine.json",
  "importBoundaryArtifactPath": "data/geocoding/unis-import-boundary-review.json",
  "limitations": [
    "The /v1/unis collection may contain only the reviewed Census-cache-backed subset from the accepted partial import boundary; it is not complete Puerto Rico higher-education coverage.",
    "Excluded rows remain outside production-style unis output until corrected address evidence or row-level authority review changes their status."
  ]
}
```

Counts and language are loaded from the checked-in boundary artifacts at
request time. Clients must treat the coverage object as disclosure and
provenance metadata, not as a ranking or suitability signal.

### Example resource requests

```sh
curl http://127.0.0.1:3001/v1/unis
curl http://127.0.0.1:3001/v1/cbps/1
```

Example successful record response:

```json
{
  "meta": {
    "total": 1,
    "count": 1,
    "offset": 0,
    "error": null
  },
  "data": [
    {
      "id": 1,
      "total_indus": 10.5,
      "total_anual": 20.5,
      "cnaic": 541,
      "cnaic_name": "Professional Services",
      "county": 1,
      "num_est": 3,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

The timestamp values above illustrate the wire format; actual values come from
the connected database.

## Planning Context Endpoints

Planning context is read from validated JSON fixtures under
`data/planning-context/`. These endpoints do not require PostgreSQL. Responses
are descriptive only and explicitly prohibit scores, rankings, and
recommendations.

### `GET /v1/planning-context`

Returns one summary per valid fixture, sorted by fixture ID.

**Response:** `200 OK`

Each `data` item has this contract:

```json
{
  "id": "mun001_construction",
  "schemaVersion": 1,
  "scope": "puerto-rico-planning-candidate",
  "status": "candidate-needs-review",
  "updatedAt": "2026-05-29",
  "municipality": {
    "code": "001",
    "label": "Adjuntas"
  },
  "businessCategory": {
    "id": "construction-service",
    "displayName": "Construction service"
  },
  "confidence": {
    "overall": "low"
  },
  "guardrails": {
    "descriptiveOnly": true,
    "noScores": true,
    "noRankings": true,
    "noRecommendations": true
  }
}
```

### `GET /v1/planning-context/{id}`

Returns the complete validated fixture as the sole item in `data`. Currently
published fixture IDs are:

- `mun001_construction`
- `mun003_restaurant`

The detail object includes:

| Field | Meaning |
| --- | --- |
| `id` | Fixture ID from its filename. |
| `schemaVersion`, `scope`, `status`, `updatedAt` | Fixture lifecycle metadata. |
| `municipality` | Municipality code system, canonical registry label, confidence, notes, and fixture extensions. |
| `businessCategory` | Category ID, display name, NAICS year/codes, confidence, status, and fixture extensions. |
| `selection` | Source ID and the deterministic municipality/NAICS selection rule. |
| `cbpFacts` | Selected source facts. Every fact has a canonical registry-backed `naicsTitle`. |
| `sourceMetadata` | Raw fixture provenance metadata retained for compatibility. |
| `confidence` | Overall confidence, rationale, and any fixture-specific confidence fields. |
| `limitations` | Required descriptive limitations. |
| `unresolvedQuestions` | Required open data/product questions. |
| `guardrails` | Fixed descriptive-only restrictions. |
| `sourceProvenance` | Normalized source count and validated source records. |

`sourceProvenance` has this shape:

```json
{
  "sourceCount": 1,
  "sources": [
    {
      "sourceId": "datospr-cbp-2014-municipios",
      "publisher": "U.S. Census Bureau",
      "portal": "Datos.PR",
      "license": "Creative Commons Attribution",
      "retrievedAt": "2026-05-24",
      "resourceUrl": "https://datos.estadisticas.pr/.../cbp14pr_mun.csv",
      "targetTables": ["cbps", "muns"],
      "legacySchemaCoverage": {
        "cnaic": "exact"
      }
    }
  ]
}
```

An unknown or syntactically invalid ID returns the standard `404` error
envelope. Invalid fixture, municipality-registry, or NAICS-registry content is
treated as a server error and returns `500` without exposing internal details.

## Status and Error Behavior

| Condition | Status | Body behavior |
| --- | --- | --- |
| Successful data request | `200` | Standard envelope with `meta.error: null`. |
| Successful preflight | `204` | Empty body. |
| Missing database record | `404` | Standard envelope, empty `data`, `meta.error: null`. |
| Unknown route or planning-context ID | `404` | Standard envelope with `meta.error: "Not Found"`. |
| Unsupported method on a recognized `/v1/*` route | `405` | Standard envelope with `meta.error: "Method Not Allowed"`; `Allow: GET, OPTIONS`. |
| Database query or fixture validation failure | `500` | Standard envelope with `meta.error: "Internal Server Error"`. |
| Failed readiness check | `503` | Operational readiness object, not the standard envelope. |

The API logs internal database and validation errors server-side and does not
return raw error messages to clients.

## Static App API Surface

The static app has one native JSON endpoint:

### `GET /healthz`

```json
{
  "status": "ok",
  "service": "utoplan-static-app",
  "apiProxy": true,
  "demoFixture": false
}
```

`apiProxy` reports whether `UTOPLAN_API_ORIGIN` is configured. `demoFixture`
reports whether `UTOPLAN_DEMO_FIXTURE=1` is active. Those two modes are mutually
exclusive and the process exits at startup if both are enabled.

Static app behavior for `/v1/*`:

- With `UTOPLAN_API_ORIGIN`, `GET` and `HEAD` requests are proxied to the modern
  API with their path and query string preserved.
- With `UTOPLAN_DEMO_FIXTURE=1`, only `/v1/unis` maps to
  `app/public/data/unis.json`; this offline fixture response is a bare JSON
  array/file and does not implement the modern API envelope or coverage
  metadata.
- Without either mode, `/v1/*` is not an API surface and normally returns
  static-file `404 Not Found`.

The static server permits only `GET` and `HEAD`. Other methods return plain-text
`405 Method Not Allowed` with `Allow: GET, HEAD`.

## Runtime Configuration

Modern API database precedence:

1. `DATABASE_URL`
2. `TEST_DATABASE_HOST`, `TEST_DATABASE_PORT`, `TEST_DATABASE_USER`,
   `TEST_DATABASE_PASSWORD`, `TEST_DATABASE_DB`
3. `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`,
   `DATABASE_DB`
4. Development defaults (`127.0.0.1:5432`, user `postgres`, database
   `dtoapi_test`)

In `NODE_ENV=production`, the API refuses to start unless `DATABASE_URL` or the
required host/user/database variables are explicitly configured.

## Contract Sources and Validation

Canonical implementation and contract sources:

- `dtoapi/modern/src/server.ts`: routing, headers, compression, and status behavior.
- `dtoapi/modern/src/resource_contract.ts`: resource names, table mappings, and public fields.
- `dtoapi/modern/src/response_contract.ts`: shared data/error envelope.
- `dtoapi/modern/src/planning_context.ts`: planning summary/detail validation and shaping.
- `dtoapi/modern/src/unis_boundary.ts`: `unis` coverage metadata.
- `app/app.js`: static health, proxy, and demo-fixture behavior.

Run the API contract tests with:

```sh
npm run test:api
npm run test:api:modern-db
```

The DB-backed command requires the documented baseline database environment or
the repository's Docker test workflow.
