'use strict';

import fs from 'fs';
import path from 'path';

export const DEFAULT_METADATA_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'mappings',
  'puerto-rico-provenance-confidence.json'
);

export interface TableAssessment {
  table: string;
  sourceIds: string[];
  preferredSourceId: string;
  sourceConfidence: string;
  transformConfidence: string;
  productionReadiness: string;
  sourceBacked: boolean;
  requiredBeforeApiPromotion: string[];
  notes: string;
}

export interface BlockedTable {
  table: string;
  sourceConfidence: string;
  transformConfidence: string;
  productionReadiness: string;
  sourceBacked: boolean;
  reason: string;
}

export interface ProvenanceContract {
  schemaVersion: number;
  scope: string;
  sourceRegistry: string;
  schemaMapping: string;
  normalizationMapping: string;
  rowProvenanceFields: string[];
  tableAssessments: TableAssessment[];
  blockedTables: BlockedTable[];
  promotionRule: string;
}

export interface SourceTableMetadata extends Omit<TableAssessment, 'table'> {
  dataClass: 'source-backed-candidate';
}

export interface BlockedTableMetadata extends Omit<BlockedTable, 'table'> {
  dataClass: 'blocked';
}

export interface SourceMetadataPayload {
  schemaVersion: number;
  scope: string;
  sourceRegistry: string;
  schemaMapping: string;
  normalizationMapping: string;
  rowProvenanceFields: string[];
  promotionRule: string;
  tables: Record<string, SourceTableMetadata>;
  blockedTables: Record<string, BlockedTableMetadata>;
}

export function readContract(filePath: string = DEFAULT_METADATA_PATH): ProvenanceContract {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ProvenanceContract;
}

export function buildPayload(contract: ProvenanceContract): SourceMetadataPayload {
  const tables: Record<string, SourceTableMetadata> = {};
  const blockedTables: Record<string, BlockedTableMetadata> = {};

  contract.tableAssessments.forEach(function(assessment) {
    const {table, ...metadata} = assessment;

    tables[table] = Object.assign({
      dataClass: 'source-backed-candidate' as const
    }, metadata);
  });

  contract.blockedTables.forEach(function(blockedTable) {
    const {table, ...metadata} = blockedTable;

    blockedTables[table] = Object.assign({
      dataClass: 'blocked' as const
    }, metadata);
  });

  return {
    schemaVersion: contract.schemaVersion,
    scope: contract.scope,
    sourceRegistry: contract.sourceRegistry,
    schemaMapping: contract.schemaMapping,
    normalizationMapping: contract.normalizationMapping,
    rowProvenanceFields: contract.rowProvenanceFields,
    promotionRule: contract.promotionRule,
    tables: tables,
    blockedTables: blockedTables
  };
}

export function payload(filePath: string = DEFAULT_METADATA_PATH): SourceMetadataPayload {
  return buildPayload(readContract(filePath));
}
