# Adjacent Planning Data Contract

Adjacent education, business, point-of-interest, and crosswalk datasets can be useful research context, but they do not currently satisfy the preserved legacy `cdepts`, `businesses`, or `grade_cs` schemas.

The machine-readable contract is `data/mappings/puerto-rico-adjacent-planning-contract.json`.

## Boundary

Adjacent sources are contract-only. They must not:

- populate preserved legacy tables;
- synthesize missing `cdepts`, `businesses`, or `grade_cs` joins;
- produce scores, rankings, recommendations, demand forecasts, profitability estimates, or graduation-to-industry rates;
- import person-level contact fields.

Allowed use is limited to source research, operator-reviewed planning context notes, manual evidence comparison, and future planning-specific schema design.

## Candidate Metadata

Future adjacent source candidates must record source owner, license, Puerto Rico scope, row grain, available fields, missing legacy requirements, privacy notes, access constraints, allowed planning use, and explicit non-inference rules.

Education sources that use CIP or field-of-study rows must remain program context unless a source-backed NAICS relationship is found. Business registry or point-of-interest sources must document coordinate, NAICS, license, and privacy gaps before any demo/API exposure.

## Validation

Run:

```sh
npm run test:adjacent-planning-contract
```

The root `npm test` command also runs this check.
