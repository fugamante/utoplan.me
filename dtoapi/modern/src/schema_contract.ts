'use strict';

import {resources} from './resource_contract';
import type {DatabaseRow, Resource} from './resource_contract';

export const BASELINE_SCHEMA_VERSION = 'baseline-read-v1';

export interface SchemaStatus {
  version: string;
  ok: boolean;
  missing: string[];
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
