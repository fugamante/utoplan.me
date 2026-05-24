'use strict';

import fs from 'fs';
import path from 'path';
import * as db from './db';
import type {DatabaseRow} from './resource_contract';

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

export const DEFAULT_CONFIDENCE_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'mappings',
  'puerto-rico-provenance-confidence.json'
);

export const SUPPORTED_LIVE_QUERY_PARAMS = ['municipality', 'category'];

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

export interface TableAssessment {
  table: string;
  preferredSourceId: string;
  sourceConfidence: string;
  transformConfidence: string;
  productionReadiness: string;
  sourceBacked: boolean;
  notes?: string;
}

export interface ProvenanceContract {
  tableAssessments: TableAssessment[];
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
  notes?: string;
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
  mode: 'demo-fixture' | 'live-db';
  generatedFrom: {
    categoryMapping: string;
    fixture?: string;
    databaseSchema?: string;
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

export interface LiveContextQuery {
  municipality: number;
  category: string;
}

export interface QueryParseResult {
  ok: boolean;
  query: LiveContextQuery | null;
  error: string | null;
}

export type LiveContextCallback = (error: Error | null, payload: PlanningContextPayload | null) => void;

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function readCategoryContract(filePath: string = DEFAULT_CATEGORY_PATH): CategoryContract {
  return readJsonFile<CategoryContract>(filePath);
}

export function readFixture(filePath: string = DEFAULT_FIXTURE_PATH): PlanningContextInput {
  return readJsonFile<PlanningContextInput>(filePath);
}

export function readConfidenceContract(filePath: string = DEFAULT_CONFIDENCE_PATH): ProvenanceContract {
  return readJsonFile<ProvenanceContract>(filePath);
}

export function categoryById(contract: CategoryContract, categoryId: string): BusinessCategory | null {
  return contract.categories.filter(function(category) {
    return category.id === categoryId;
  })[0] || null;
}

export function tableAssessmentByName(contract: ProvenanceContract, tableName: string): TableAssessment | null {
  return contract.tableAssessments.filter(function(assessment) {
    return assessment.table === tableName;
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

export function parseLiveQuery(params: URLSearchParams, categoryContract: CategoryContract): QueryParseResult {
  const unknownParams = Array.from(params.keys()).filter(function(key) {
    return SUPPORTED_LIVE_QUERY_PARAMS.indexOf(key) === -1;
  });
  const municipality = params.get('municipality');
  const category = params.get('category');
  const integerPattern = /^[0-9]+$/;
  const categoryPattern = /^[a-z0-9]+(_[a-z0-9]+){0,2}$/;
  const categoryRecord = category ? categoryById(categoryContract, category) : null;

  if (unknownParams.length > 0) {
    return {
      ok: false,
      query: null,
      error: 'Unsupported query parameter: ' + unknownParams[0]
    };
  }

  if (!municipality || !integerPattern.test(municipality) || Number(municipality) < 1) {
    return {
      ok: false,
      query: null,
      error: 'municipality must be a positive integer'
    };
  }

  if (!category || !categoryPattern.test(category)) {
    return {
      ok: false,
      query: null,
      error: 'category must be a known business category id'
    };
  }

  if (!categoryRecord || categoryRecord.status !== 'candidate') {
    return {
      ok: false,
      query: null,
      error: 'category must be a known candidate business category'
    };
  }

  return {
    ok: true,
    query: {
      municipality: Number(municipality),
      category: category
    },
    error: null
  };
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

function selectedCategory(category: BusinessCategory): BusinessCategory {
  return {
    id: category.id,
    displayName: category.displayName,
    mappedNaics: category.mappedNaics,
    assumptions: category.assumptions,
    confidence: category.confidence,
    status: category.status,
    limitations: category.limitations
  };
}

function basePayload(
  mode: 'demo-fixture' | 'live-db',
  generatedFrom: PlanningContextPayload['generatedFrom'],
  municipality: Municipality,
  category: BusinessCategory,
  facts: PlanningFact[],
  categoryContract: CategoryContract
): PlanningContextPayload {
  return {
    schemaVersion: 1,
    scope: 'puerto-rico-only',
    mode: mode,
    generatedFrom: generatedFrom,
    selectedMunicipality: municipality,
    selectedCategory: selectedCategory(category),
    facts: facts,
    signals: [],
    confidence: {
      label: confidenceFromFacts(facts),
      basis: facts.length > 0 ? 'Lowest visible source or transform confidence among selected facts.' : 'No source-backed facts are attached to this live context yet.'
    },
    unresolvedQuestions: categoryContract.requiredBeforePlanningEndpoint.concat(category.limitations),
    suggestedNextChecks: [
      'Review source confidence and transform confidence before using these facts in UI planning summaries.',
      'Confirm that the selected NAICS mappings are appropriate for the business idea.',
      'Add ACS, unemployment, zoning, or permit context before presenting feasibility signals.'
    ]
  };
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

  return basePayload(
    'demo-fixture',
    {
      categoryMapping: 'data/mappings/puerto-rico-business-categories.json',
      fixture: 'data/fixtures/non-production/planning-context-fixture.json'
    },
    input.selectedMunicipality,
    category,
    facts,
    categoryContract
  );
}

export function payload(
  fixturePath: string = DEFAULT_FIXTURE_PATH,
  categoryPath: string = DEFAULT_CATEGORY_PATH
): PlanningContextPayload {
  return buildPayload(readFixture(fixturePath), readCategoryContract(categoryPath));
}

export function selectMunicipalityById(): string {
  return 'SELECT id, title, county FROM muns WHERE id = $1 LIMIT 1';
}

export function selectCbpRowsByCounty(): string {
  return 'SELECT id, total_indus, total_anual, cnaic, cnaic_name, county, num_est FROM cbps WHERE county = $1 ORDER BY id';
}

export function municipalityFromRow(row: DatabaseRow): Municipality {
  return {
    id: String(row.id),
    title: String(row.title),
    county: Number(row.county),
    geographyLevel: 'municipality'
  };
}

export function cbpRowFromDatabase(row: DatabaseRow, assessment: TableAssessment): CbpRow {
  return {
    sourceId: assessment.preferredSourceId,
    rowIndex: Number(row.id || 0),
    record: {
      total_indus: Number(row.total_indus),
      total_anual: Number(row.total_anual),
      cnaic: Number(row.cnaic),
      cnaic_name: String(row.cnaic_name || ''),
      county: Number(row.county),
      num_est: Number(row.num_est)
    },
    provenance: {
      sourceConfidence: assessment.sourceConfidence,
      transformConfidence: assessment.transformConfidence,
      productionReadiness: assessment.productionReadiness,
      sourceBacked: !!assessment.sourceBacked,
      notes: assessment.notes
    }
  };
}

export function livePayload(query: LiveContextQuery, callback: LiveContextCallback): void {
  const categoryContract = readCategoryContract();
  const confidenceContract = readConfidenceContract();
  const category = categoryById(categoryContract, query.category);
  const cbpAssessment = tableAssessmentByName(confidenceContract, 'cbps');

  if (!category || !cbpAssessment) {
    callback(null, null);
    return;
  }

  db.query(selectMunicipalityById(), [query.municipality], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    if (!result.rows[0]) {
      callback(null, null);
      return;
    }

    const municipality = municipalityFromRow(result.rows[0]);

    db.query(selectCbpRowsByCounty(), [municipality.county], function(cbpError, cbpResult) {
      if (cbpError) {
        callback(cbpError, null);
        return;
      }

      const input: PlanningContextInput = {
        selectedMunicipality: municipality,
        selectedCategoryId: query.category,
        cbps: cbpResult.rows.map(function(row) {
          return cbpRowFromDatabase(row, cbpAssessment);
        })
      };

      callback(null, basePayload(
        'live-db',
        {
          categoryMapping: 'data/mappings/puerto-rico-business-categories.json',
          databaseSchema: 'baseline-read-v1'
        },
        municipality,
        category,
        cbpFacts(input, category),
        categoryContract
      ));
    });
  });
}
