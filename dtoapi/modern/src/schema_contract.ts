'use strict';

import {resources} from './resource_contract';
import type {DatabaseRow, Resource} from './resource_contract';

export const BASELINE_SCHEMA_VERSION = 'baseline-read-v1';
export const ANONYMOUS_SCHEMA_VERSION = 'anonymous-session-v1';

export interface ExpectedLoadIndex {
  table: string;
  name: string;
  columns: string[];
  unique?: boolean;
  predicate?: string;
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

export interface AnonymousSchemaStatus {
  version: string;
  ok: boolean;
  missing: string[];
  indexes: LoadIndexStatus;
}

function expectedColumns(): Record<string, string[]> {
  const expected = Object.keys(resources).reduce(function(columns: Record<string, string[]>, name: string) {
    const resource = resources[name as keyof typeof resources] as Resource;
    columns[resource.table] = resource.columns.slice();
    return columns;
  }, {});

  expected.demo_sessions = ['id', 'public_id', 'display_name', 'municipality_id', 'category_id', 'profile', 'created_at', 'updated_at'];

  return expected;
}

function expectedAnonymousColumns(): Record<string, string[]> {
  return {
    anonymous_sessions: [
      'id',
      'public_id',
      'token_hash',
      'csrf_token_hash',
      'created_at',
      'last_seen_at',
      'expires_at',
      'rotated_at',
      'revoked_at',
      'revoke_reason'
    ],
    anonymous_planning_profiles: [
      'id',
      'anonymous_session_id',
      'schema_version',
      'row_version',
      'profile',
      'created_at',
      'updated_at',
      'deleted_at',
      'deletion_requested_at',
      'export_requested_at'
    ],
    anonymous_profile_events: [
      'id',
      'anonymous_session_id',
      'anonymous_profile_id',
      'event_name',
      'created_at',
      'metadata'
    ],
    anonymous_rate_limit_buckets: [
      'rate_limit_key',
      'scope',
      'request_count',
      'reset_at',
      'updated_at'
    ]
  };
}

export function expectedTables(): string[] {
  return Object.keys(expectedColumns()).sort();
}

export function expectedAnonymousTables(): string[] {
  return Object.keys(expectedAnonymousColumns()).sort();
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

export function anonymousStatusParams(): string[][] {
  return [expectedAnonymousTables()];
}

export function anonymousStatusQuery(): string {
  return statusQuery();
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

export function expectedAnonymousIndexes(): ExpectedLoadIndex[] {
  return [
    {
      table: 'anonymous_sessions',
      name: 'anonymous_sessions_public_id_unique',
      columns: ['public_id']
    },
    {
      table: 'anonymous_sessions',
      name: 'anonymous_sessions_token_hash_unique',
      columns: ['token_hash']
    },
    {
      table: 'anonymous_sessions',
      name: 'anonymous_sessions_active_expiry_index',
      columns: ['expires_at'],
      unique: false,
      predicate: 'revoked_at is null'
    },
    {
      table: 'anonymous_planning_profiles',
      name: 'anonymous_planning_profiles_session_active_unique',
      columns: ['anonymous_session_id'],
      predicate: 'deleted_at is null'
    },
    {
      table: 'anonymous_planning_profiles',
      name: 'anonymous_planning_profiles_retention_index',
      columns: ['deleted_at', 'updated_at'],
      unique: false
    },
    {
      table: 'anonymous_profile_events',
      name: 'anonymous_profile_events_session_created_index',
      columns: ['anonymous_session_id', 'created_at'],
      unique: false
    },
    {
      table: 'anonymous_profile_events',
      name: 'anonymous_profile_events_profile_created_index',
      columns: ['anonymous_profile_id', 'created_at'],
      unique: false
    },
    {
      table: 'anonymous_rate_limit_buckets',
      name: 'anonymous_rate_limit_buckets_pkey',
      columns: ['rate_limit_key']
    },
    {
      table: 'anonymous_rate_limit_buckets',
      name: 'anonymous_rate_limit_buckets_reset_index',
      columns: ['reset_at'],
      unique: false
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

export function anonymousIndexStatusParams(): string[][] {
  return [expectedAnonymousIndexes().map(function(index: ExpectedLoadIndex) {
    return index.name;
  })];
}

export function anonymousIndexStatusQuery(): string {
  return loadIndexStatusQuery();
}

function evaluateColumns(rows: DatabaseRow[], columnsByTable: Record<string, string[]>): string[] {
  const actual = rows.reduce(function(found: Record<string, Record<string, boolean>>, row: DatabaseRow) {
    const tableName = String(row.table_name || '');
    const columnName = String(row.column_name || '');

    if (!found[tableName]) {
      found[tableName] = {};
    }

    found[tableName][columnName] = true;
    return found;
  }, {});

  return Object.keys(columnsByTable).reduce(function(results: string[], tableName: string) {
    const columns = columnsByTable[tableName];

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
}

export function evaluate(rows: DatabaseRow[]): SchemaStatus {
  const missing = evaluateColumns(rows, expectedColumns());

  return {
    version: BASELINE_SCHEMA_VERSION,
    ok: missing.length === 0,
    missing: missing
  };
}

export function evaluateAnonymous(rows: DatabaseRow[], indexRows: DatabaseRow[]): AnonymousSchemaStatus {
  const missing = evaluateColumns(rows, expectedAnonymousColumns());
  const indexes = evaluateExpectedIndexes(indexRows, expectedAnonymousIndexes());

  return {
    version: ANONYMOUS_SCHEMA_VERSION,
    ok: missing.length === 0 && indexes.ok,
    missing: missing,
    indexes: indexes
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
  return evaluateExpectedIndexes(rows, expectedLoadIndexes());
}

function evaluateExpectedIndexes(rows: DatabaseRow[], expectedIndexes: ExpectedLoadIndex[]): LoadIndexStatus {
  const actual = rows.reduce(function(found: Record<string, DatabaseRow>, row: DatabaseRow) {
    found[String(row.indexname || '')] = row;
    return found;
  }, {});

  const missing = expectedIndexes.reduce(function(results: string[], expected: ExpectedLoadIndex) {
    const row = actual[expected.name];
    const indexDef = String(row ? row.indexdef || '' : '').toLowerCase();
    const expectedColumns = '(' + expected.columns.join(', ') + ')';

    if (!row || String(row.tablename || '') !== expected.table) {
      results.push(expected.name);
      return results;
    }

    if (expected.unique !== false && indexDef.indexOf('unique index') === -1) {
      results.push(expected.name);
      return results;
    }

    if (indexDef.indexOf(expectedColumns) === -1) {
      results.push(expected.name);
      return results;
    }

    if (expected.predicate && indexDef.indexOf(expected.predicate) === -1) {
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
