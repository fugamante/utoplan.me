'use strict';

import fs from 'fs';
import path from 'path';

export const DEFAULT_CATEGORY_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'mappings',
  'puerto-rico-business-categories.json'
);

export const DEFAULT_FIXTURE_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'fixtures',
  'non-production',
  'planning-context-fixture.json'
);

export interface Municipality {
  id: string;
  title: string;
  county: number;
  geographyLevel: string;
}

export interface NaicsMapping {
  code: string;
  title: string;
  match: string;
}

export interface BusinessCategory {
  id: string;
  displayName: string;
  mappedNaics: NaicsMapping[];
  assumptions: string[];
  confidence: string;
  status: string;
  limitations: string[];
}

export interface CategoryContract {
  requiredBeforePlanningEndpoint: string[];
  categories: BusinessCategory[];
}

export interface CbpRecord {
  total_indus: number;
  total_anual: number;
  cnaic: number;
  cnaic_name: string;
  county: number;
  num_est: number;
}

export interface RowProvenance {
  sourceConfidence: string;
  transformConfidence: string;
  productionReadiness: string;
  sourceBacked: boolean;
}

export interface CbpRow {
  sourceId: string;
  rowIndex: number;
  record: CbpRecord;
  provenance: RowProvenance;
}

export interface PlanningContextInput {
  selectedMunicipality: Municipality;
  selectedCategoryId: string;
  cbps: CbpRow[];
}

export interface PlanningFact {
  table: string;
  sourceId: string;
  rowIndex: number;
  place: Municipality;
  naics: {
    code: string;
    title: string;
    matchedCategoryCodes: string[];
  };
  confidence: {
    source: string;
    transform: string;
    productionReadiness: string;
    sourceBacked: boolean;
  };
  limitations: string[];
  factType: string;
  value: number;
  unit: string;
}

export interface PlanningContextPayload {
  schemaVersion: number;
  scope: string;
  mode: 'demo-fixture';
  generatedFrom: {
    categoryMapping: string;
    fixture: string;
  };
  selectedMunicipality: Municipality;
  selectedCategory: BusinessCategory;
  facts: PlanningFact[];
  signals: [];
  confidence: {
    label: string;
    basis: string;
  };
  unresolvedQuestions: string[];
  suggestedNextChecks: string[];
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function readCategoryContract(filePath: string = DEFAULT_CATEGORY_PATH): CategoryContract {
  return readJsonFile<CategoryContract>(filePath);
}

export function readFixture(filePath: string = DEFAULT_FIXTURE_PATH): PlanningContextInput {
  return readJsonFile<PlanningContextInput>(filePath);
}

export function categoryById(contract: CategoryContract, categoryId: string): BusinessCategory | null {
  return contract.categories.filter(function(category) {
    return category.id === categoryId;
  })[0] || null;
}

export function naicsMatches(rowCode: string | number, categoryCode: string): boolean {
  const row = String(rowCode || '');
  const category = String(categoryCode || '');

  return row === category || row.indexOf(category) === 0 || category.indexOf(row) === 0;
}

export function matchedNaics(rowCode: string | number, category: BusinessCategory): NaicsMapping[] {
  return category.mappedNaics.filter(function(naics) {
    return naicsMatches(rowCode, naics.code);
  });
}

export function confidenceFromFacts(facts: PlanningFact[]): string {
  if (facts.some(function(fact) {
    return fact.confidence.transform === 'low' || fact.confidence.source === 'low';
  })) {
    return 'low';
  }

  if (facts.some(function(fact) {
    return fact.confidence.transform === 'medium' || fact.confidence.source === 'medium';
  })) {
    return 'medium';
  }

  return facts.length > 0 ? 'high' : 'unknown';
}

function baseFact(input: PlanningContextInput, row: CbpRow, matches: NaicsMapping[]) {
  return {
    table: 'cbps',
    sourceId: row.sourceId,
    rowIndex: row.rowIndex,
    place: input.selectedMunicipality,
    naics: {
      code: String(row.record.cnaic),
      title: row.record.cnaic_name,
      matchedCategoryCodes: matches.map(function(match) {
        return match.code;
      })
    },
    confidence: {
      source: row.provenance.sourceConfidence,
      transform: row.provenance.transformConfidence,
      productionReadiness: row.provenance.productionReadiness,
      sourceBacked: !!row.provenance.sourceBacked
    },
    limitations: [
      'CBP facts describe observed business-pattern context, not demand, profitability, or recommendation rank.'
    ]
  };
}

export function cbpFacts(input: PlanningContextInput, category: BusinessCategory): PlanningFact[] {
  return input.cbps.reduce(function(facts: PlanningFact[], row) {
    const matches = matchedNaics(row.record.cnaic, category);
    const base = baseFact(input, row, matches);

    if (Number(row.record.county) !== Number(input.selectedMunicipality.county) || matches.length === 0) {
      return facts;
    }

    facts.push(Object.assign({}, base, {
      factType: 'establishment_count',
      value: row.record.num_est,
      unit: 'establishments'
    }));
    facts.push(Object.assign({}, base, {
      factType: 'annual_payroll',
      value: row.record.total_anual,
      unit: 'source-defined annual payroll'
    }));
    facts.push(Object.assign({}, base, {
      factType: 'employment_count',
      value: row.record.total_indus,
      unit: 'employees or jobs, pending source-label review'
    }));

    return facts;
  }, []);
}

export function buildPayload(input: PlanningContextInput, categoryContract: CategoryContract): PlanningContextPayload {
  const category = categoryById(categoryContract, input.selectedCategoryId);

  if (!category) {
    throw new Error('Unknown business category: ' + input.selectedCategoryId);
  }

  const facts = cbpFacts(input, category);

  return {
    schemaVersion: 1,
    scope: 'puerto-rico-only',
    mode: 'demo-fixture',
    generatedFrom: {
      categoryMapping: 'data/mappings/puerto-rico-business-categories.json',
      fixture: 'data/fixtures/non-production/planning-context-fixture.json'
    },
    selectedMunicipality: input.selectedMunicipality,
    selectedCategory: category,
    facts: facts,
    signals: [],
    confidence: {
      label: confidenceFromFacts(facts),
      basis: 'Lowest visible source or transform confidence among selected facts.'
    },
    unresolvedQuestions: categoryContract.requiredBeforePlanningEndpoint.concat(category.limitations),
    suggestedNextChecks: [
      'Review source confidence and transform confidence before using these facts in UI planning summaries.',
      'Confirm that the selected NAICS mappings are appropriate for the business idea.',
      'Add ACS, unemployment, zoning, or permit context before presenting feasibility signals.'
    ]
  };
}

export function payload(
  fixturePath: string = DEFAULT_FIXTURE_PATH,
  categoryPath: string = DEFAULT_CATEGORY_PATH
): PlanningContextPayload {
  return buildPayload(readFixture(fixturePath), readCategoryContract(categoryPath));
}
