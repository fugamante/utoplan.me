'use strict';

import {resources} from './resource_contract';
import type {DatabaseRow, Resource} from './resource_contract';

export const BASELINE_SCHEMA_VERSION = 'baseline-read-v1';

export interface ExpectedLoadIndex {
  table: string;
  name: string;
  columns: string[];
}

export interface LoadIndexStatus {
  ok: boolean;
  missing: string[];
  unavailable: boolean;
}

export interface SchemaStatus {
  version: string;
  ok: boolean;
  missing: string[];
  loadIndexes?: LoadIndexStatus;
}

function expectedColumns(): Record<string, string[]> {
  return Object.keys(resources).reduce(function(expected: Record<string, string[]>, name: string) {
    const resource = resources[name as keyof typeof resources] as Resource;
    expected[resource.table] = resource.columns.slice();
    return expected;
  }, {});
}

export function expectedTables(): string[] {
  return Object.keys(expectedColumns()).sort();
}

export function statusQuery(): string {
  return [
    'SELECT table_name, column_name',
    'FROM information_schema.columns',
    "WHERE table_schema = 'public'",
    'AND table_name = ANY($1)',
    'ORDER BY table_name, ordinal_position'
  ].join(' ');
}

export function statusParams(): string[][] {
  return [expectedTables()];
}

export function expectedLoadIndexes(): ExpectedLoadIndex[] {
  return [
    {
      table: 'cbps',
      name: 'cbps_county_cnaic_unique',
      columns: ['county', 'cnaic']
    },
    {
      table: 'muns',
      name: 'muns_county_unique',
      columns: ['county']
    },
    {
      table: 'unis',
      name: 'unis_title_address_unique',
      columns: ['title', 'address']
    }
  ];
}

export function loadIndexStatusQuery(): string {
  return [
    'SELECT tablename, indexname, indexdef',
    'FROM pg_indexes',
    "WHERE schemaname = 'public'",
    'AND indexname = ANY($1)',
    'ORDER BY indexname'
  ].join(' ');
}

export function loadIndexStatusParams(): string[][] {
  return [expectedLoadIndexes().map(function(index: ExpectedLoadIndex) {
    return index.name;
  })];
}

export function evaluate(rows: DatabaseRow[]): SchemaStatus {
  const actual = rows.reduce(function(found: Record<string, Record<string, boolean>>, row: DatabaseRow) {
    const tableName = String(row.table_name || '');
    const columnName = String(row.column_name || '');

    if (!found[tableName]) {
      found[tableName] = {};
    }

    found[tableName][columnName] = true;
    return found;
  }, {});

  const missing = Object.keys(expectedColumns()).reduce(function(results: string[], tableName: string) {
    const columns = expectedColumns()[tableName];

    if (!actual[tableName]) {
      results.push(tableName + '.*');
      return results;
    }

    columns.forEach(function(columnName: string) {
      if (!actual[tableName][columnName]) {
        results.push(tableName + '.' + columnName);
      }
    });

    return results;
  }, []);

  return {
    version: BASELINE_SCHEMA_VERSION,
    ok: missing.length === 0,
    missing: missing
  };
}

export function unavailableLoadIndexes(): LoadIndexStatus {
  return {
    ok: false,
    missing: expectedLoadIndexes().map(function(index: ExpectedLoadIndex) {
      return index.name;
    }),
    unavailable: true
  };
}

export function evaluateLoadIndexes(rows: DatabaseRow[]): LoadIndexStatus {
  const actual = rows.reduce(function(found: Record<string, DatabaseRow>, row: DatabaseRow) {
    found[String(row.indexname || '')] = row;
    return found;
  }, {});

  const missing = expectedLoadIndexes().reduce(function(results: string[], expected: ExpectedLoadIndex) {
    const row = actual[expected.name];
    const indexDef = String(row ? row.indexdef || '' : '').toLowerCase();

    if (!row || String(row.tablename || '') !== expected.table || indexDef.indexOf('unique index') === -1) {
      results.push(expected.name);
    }

    return results;
  }, []);

  return {
    ok: missing.length === 0,
    missing: missing,
    unavailable: false
  };
}
