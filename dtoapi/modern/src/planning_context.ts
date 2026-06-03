'use strict';

import fs from 'fs';
import path from 'path';

const FIXTURE_EXTENSION = '.json';
const FIXTURE_DIR = path.resolve(__dirname, '..', '..', '..', 'data', 'planning-context');
const MUNICIPALITY_REGISTRY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'municipalities',
  'planning-context-municipalities.json'
);
const FIXTURE_ID_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const FORBIDDEN_DECISION_PATTERN = /\b(score|rank|ranking|recommend|best|should choose|profitable|suitability)\b/i;

export interface Guardrails {
  descriptiveOnly: true;
  noScores: true;
  noRankings: true;
  noRecommendations: true;
}

export interface PlanningContextSummary {
  id: string;
  schemaVersion: number;
  scope: string;
  status: string;
  updatedAt: string;
  municipality: {
    code: string;
    label: string;
  };
  businessCategory: {
    id: string;
    displayName: string;
  };
  confidence: {
    overall: string;
  };
  guardrails: Guardrails;
}

export interface PlanningContextFixture {
  schemaVersion: number;
  scope: string;
  status: string;
  updatedAt: string;
  municipality: {
    code: string;
    codeSystem: string;
    label: string;
    confidence: string;
    notes: string;
    [key: string]: unknown;
  };
  businessCategory: {
    id: string;
    displayName: string;
    naicsYear: number;
    naicsCodes: string[];
    confidence: string;
    status: string;
    [key: string]: unknown;
  };
  selection: {
    sourceId: string;
    municipalityCode: string;
    municipalityCodeField: string;
    selectedNaicsCodes: string[];
    matchRule: string;
    selectionBasis: string;
    [key: string]: unknown;
  };
  cbpFacts: Array<Record<string, unknown>>;
  sourceMetadata: Array<Record<string, unknown>>;
  confidence: {
    overall: string;
    rationale: string[];
    [key: string]: unknown;
  };
  limitations: string[];
  unresolvedQuestions: string[];
  [key: string]: unknown;
}

export interface PlanningContextDetail extends PlanningContextFixture {
  id: string;
  guardrails: Guardrails;
}

interface FixtureEntry {
  id: string;
  fixture: PlanningContextFixture;
}

interface MunicipalityRegistryEntry {
  code: string;
  name: string;
}

interface MunicipalityRegistry {
  schemaVersion: number;
  scope: string;
  codeSystem: string;
  sourceId: string;
  sourceFieldCode: string;
  sourceFieldName: string;
  retrievedAt: string;
  entries: MunicipalityRegistryEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseFixtureId(filename: string): string {
  if (!filename.endsWith(FIXTURE_EXTENSION)) {
    throw new Error('Invalid planning-context fixture extension: ' + filename);
  }

  const id = filename.slice(0, -FIXTURE_EXTENSION.length);

  if (!FIXTURE_ID_PATTERN.test(id)) {
    throw new Error('Invalid planning-context fixture id: ' + id);
  }

  return id;
}

function assertNoForbiddenDecisionLanguage(value: string, label: string): void {
  if (FORBIDDEN_DECISION_PATTERN.test(value)) {
    throw new Error(label + ' must stay descriptive');
  }
}

function assertStringArray(values: unknown, label: string): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(label + ' must be a non-empty array');
  }

  const output: string[] = [];

  values.forEach(function(value: unknown, index: number): void {
    if (!isNonEmptyString(value)) {
      throw new Error(label + ' must contain non-empty strings at index ' + index);
    }

    output.push(value);
  });

  return output;
}

function readMunicipalityRegistry(): MunicipalityRegistry {
  const raw = JSON.parse(fs.readFileSync(MUNICIPALITY_REGISTRY_PATH, 'utf8')) as unknown;

  if (!isRecord(raw)) {
    throw new Error('municipality registry must be an object');
  }

  if (raw.schemaVersion !== 1) {
    throw new Error('municipality registry schemaVersion must be 1');
  }

  if (
    !isNonEmptyString(raw.scope) ||
    !isNonEmptyString(raw.codeSystem) ||
    !isNonEmptyString(raw.sourceId) ||
    !isNonEmptyString(raw.sourceFieldCode) ||
    !isNonEmptyString(raw.sourceFieldName) ||
    !isNonEmptyString(raw.retrievedAt)
  ) {
    throw new Error('municipality registry metadata is incomplete');
  }

  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    throw new Error('municipality registry entries must be a non-empty array');
  }

  const entries = raw.entries.map(function(entry: unknown, index: number): MunicipalityRegistryEntry {
    if (!isRecord(entry) || !isNonEmptyString(entry.code) || !isNonEmptyString(entry.name)) {
      throw new Error('municipality registry entry is invalid at index ' + index);
    }

    if (!/^[0-9]{3}$/.test(entry.code)) {
      throw new Error('municipality registry code must be three digits at index ' + index);
    }

    return {
      code: entry.code,
      name: entry.name
    };
  });

  return {
    schemaVersion: 1,
    scope: raw.scope,
    codeSystem: raw.codeSystem,
    sourceId: raw.sourceId,
    sourceFieldCode: raw.sourceFieldCode,
    sourceFieldName: raw.sourceFieldName,
    retrievedAt: raw.retrievedAt,
    entries
  };
}

function resolveMunicipalityLabel(code: string, codeSystem: string): string {
  const registry = readMunicipalityRegistry();

  if (registry.codeSystem !== codeSystem) {
    throw new Error('municipality registry codeSystem mismatch for ' + code);
  }

  const entry = registry.entries.find(function(candidate: MunicipalityRegistryEntry): boolean {
    return candidate.code === code;
  });

  if (!entry) {
    throw new Error('missing municipality registry entry for ' + code);
  }

  return entry.name;
}

function validateFixtureShape(value: unknown, id: string): PlanningContextFixture {
  if (!isRecord(value)) {
    throw new Error(id + ' fixture must be an object');
  }

  const schemaVersion = value.schemaVersion;
  const scope = value.scope;
  const status = value.status;
  const updatedAt = value.updatedAt;
  const municipality = value.municipality;
  const businessCategory = value.businessCategory;
  const selection = value.selection;
  const cbpFacts = value.cbpFacts;
  const sourceMetadata = value.sourceMetadata;
  const confidence = value.confidence;
  const limitations = value.limitations;
  const unresolvedQuestions = value.unresolvedQuestions;

  if (schemaVersion !== 1) {
    throw new Error(id + ' schemaVersion must be 1');
  }

  if (!isNonEmptyString(scope) || !isNonEmptyString(status) || !isNonEmptyString(updatedAt)) {
    throw new Error(id + ' scope, status, and updatedAt are required');
  }

  if (!isRecord(municipality)) {
    throw new Error(id + ' municipality must be an object');
  }

  if (!isRecord(businessCategory)) {
    throw new Error(id + ' businessCategory must be an object');
  }

  if (!isRecord(selection)) {
    throw new Error(id + ' selection must be an object');
  }

  if (!Array.isArray(cbpFacts) || cbpFacts.length === 0) {
    throw new Error(id + ' cbpFacts must be a non-empty array');
  }

  if (!Array.isArray(sourceMetadata) || sourceMetadata.length === 0) {
    throw new Error(id + ' sourceMetadata must be a non-empty array');
  }

  if (!isRecord(confidence)) {
    throw new Error(id + ' confidence must be an object');
  }

  const normalizedLimitations = assertStringArray(limitations, id + ' limitations');
  const normalizedQuestions = assertStringArray(unresolvedQuestions, id + ' unresolvedQuestions');

  if (!isNonEmptyString(municipality.code) || !isNonEmptyString(municipality.codeSystem) || !isNonEmptyString(municipality.label) || !isNonEmptyString(municipality.notes) || !isNonEmptyString(municipality.confidence)) {
    throw new Error(id + ' municipality fields are incomplete');
  }

  const canonicalMunicipalityLabel = resolveMunicipalityLabel(municipality.code, municipality.codeSystem);

  if (!isNonEmptyString(businessCategory.id) || !isNonEmptyString(businessCategory.displayName) || !isNonEmptyString(businessCategory.confidence) || !isNonEmptyString(businessCategory.status) || !Array.isArray(businessCategory.naicsCodes) || businessCategory.naicsCodes.length === 0 || typeof businessCategory.naicsYear !== 'number') {
    throw new Error(id + ' businessCategory fields are incomplete');
  }

  if (!isNonEmptyString(selection.sourceId) || !isNonEmptyString(selection.municipalityCode) || !isNonEmptyString(selection.municipalityCodeField) || !Array.isArray(selection.selectedNaicsCodes) || selection.selectedNaicsCodes.length === 0 || !isNonEmptyString(selection.matchRule) || !isNonEmptyString(selection.selectionBasis)) {
    throw new Error(id + ' selection fields are incomplete');
  }

  if (!isNonEmptyString(confidence.overall) || !Array.isArray(confidence.rationale) || confidence.rationale.length === 0) {
    throw new Error(id + ' confidence fields are incomplete');
  }

  return {
    ...value,
    schemaVersion,
    scope,
    status,
    updatedAt,
    municipality: {
      ...(municipality as PlanningContextFixture['municipality']),
      label: canonicalMunicipalityLabel
    },
    businessCategory: businessCategory as PlanningContextFixture['businessCategory'],
    selection: selection as PlanningContextFixture['selection'],
    cbpFacts: cbpFacts as Array<Record<string, unknown>>,
    sourceMetadata: sourceMetadata as Array<Record<string, unknown>>,
    confidence: confidence as PlanningContextFixture['confidence'],
    limitations: normalizedLimitations,
    unresolvedQuestions: normalizedQuestions
  };
}

function validateDescriptiveGuardrails(fixture: PlanningContextFixture, id: string): void {
  assertNoForbiddenDecisionLanguage(fixture.municipality.notes, id + ' municipality.notes');
  assertNoForbiddenDecisionLanguage(fixture.selection.selectionBasis, id + ' selection.selectionBasis');

  fixture.cbpFacts.forEach(function(fact: Record<string, unknown>, index: number): void {
    if (isNonEmptyString(fact.notes)) {
      assertNoForbiddenDecisionLanguage(fact.notes, id + ' cbpFacts[' + index + '].notes');
    }
  });

  fixture.confidence.rationale.forEach(function(note: string, index: number): void {
    assertNoForbiddenDecisionLanguage(note, id + ' confidence.rationale[' + index + ']');
  });

  fixture.limitations.forEach(function(note: string, index: number): void {
    assertNoForbiddenDecisionLanguage(note, id + ' limitations[' + index + ']');
  });

  fixture.unresolvedQuestions.forEach(function(question: string, index: number): void {
    assertNoForbiddenDecisionLanguage(question, id + ' unresolvedQuestions[' + index + ']');
  });
}

function readFixtureEntry(filename: string): FixtureEntry {
  const id = parseFixtureId(filename);
  const filepath = path.join(FIXTURE_DIR, filename);
  const raw = JSON.parse(fs.readFileSync(filepath, 'utf8')) as unknown;
  const fixture = validateFixtureShape(raw, id);

  validateDescriptiveGuardrails(fixture, id);

  return {
    id,
    fixture
  };
}

function guardrails(): Guardrails {
  return {
    descriptiveOnly: true,
    noScores: true,
    noRankings: true,
    noRecommendations: true
  };
}

export function listFixtureIds(): string[] {
  if (!fs.existsSync(FIXTURE_DIR)) {
    return [];
  }

  return fs.readdirSync(FIXTURE_DIR)
    .filter(function(filename: string): boolean {
      return filename.endsWith(FIXTURE_EXTENSION);
    })
    .map(parseFixtureId)
    .sort();
}

function readAllFixtures(): FixtureEntry[] {
  return listFixtureIds().map(function(id: string): FixtureEntry {
    return readFixtureEntry(id + FIXTURE_EXTENSION);
  });
}

export function listSummaries(): PlanningContextSummary[] {
  return readAllFixtures().map(function(entry: FixtureEntry): PlanningContextSummary {
    return {
      id: entry.id,
      schemaVersion: entry.fixture.schemaVersion,
      scope: entry.fixture.scope,
      status: entry.fixture.status,
      updatedAt: entry.fixture.updatedAt,
      municipality: {
        code: entry.fixture.municipality.code,
        label: entry.fixture.municipality.label
      },
      businessCategory: {
        id: entry.fixture.businessCategory.id,
        displayName: entry.fixture.businessCategory.displayName
      },
      confidence: {
        overall: entry.fixture.confidence.overall
      },
      guardrails: guardrails()
    };
  });
}

export function findDetail(id: string): PlanningContextDetail | null {
  if (!FIXTURE_ID_PATTERN.test(id)) {
    return null;
  }

  const filepath = path.join(FIXTURE_DIR, id + FIXTURE_EXTENSION);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filepath, 'utf8')) as unknown;
  const fixture = validateFixtureShape(raw, id);

  validateDescriptiveGuardrails(fixture, id);

  return {
    id,
    ...fixture,
    guardrails: guardrails()
  };
}
