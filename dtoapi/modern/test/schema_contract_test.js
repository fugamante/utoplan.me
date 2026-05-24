'use strict';

const assert = require('assert');
const schemaContract = require('../lib/schema_contract');

assert.strictEqual(schemaContract.BASELINE_SCHEMA_VERSION, 'baseline-read-v1');
assert.strictEqual(schemaContract.ANONYMOUS_SCHEMA_VERSION, 'anonymous-session-v1');
assert.deepStrictEqual(schemaContract.expectedTables(), [
  'businesses',
  'cbps',
  'cdepts',
  'demo_sessions',
  'grade_cs',
  'muns',
  'unis'
]);
assert(schemaContract.statusQuery().indexOf('information_schema.columns') !== -1);
assert.deepStrictEqual(schemaContract.statusParams(), [[
  'businesses',
  'cbps',
  'cdepts',
  'demo_sessions',
  'grade_cs',
  'muns',
  'unis'
]]);
assert.deepStrictEqual(schemaContract.expectedAnonymousTables(), [
  'anonymous_planning_profiles',
  'anonymous_profile_events',
  'anonymous_sessions'
]);
assert.strictEqual(schemaContract.anonymousStatusQuery(), schemaContract.statusQuery());
assert.deepStrictEqual(schemaContract.anonymousStatusParams(), [[
  'anonymous_planning_profiles',
  'anonymous_profile_events',
  'anonymous_sessions'
]]);
assert.deepStrictEqual(schemaContract.expectedLoadIndexes(), [
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
]);
assert(schemaContract.loadIndexStatusQuery().indexOf('pg_indexes') !== -1);
assert.deepStrictEqual(schemaContract.loadIndexStatusParams(), [[
  'cbps_county_cnaic_unique',
  'muns_county_unique',
  'unis_title_address_unique'
]]);
assert.deepStrictEqual(schemaContract.anonymousIndexStatusParams(), [[
  'anonymous_sessions_public_id_unique',
  'anonymous_sessions_token_hash_unique',
  'anonymous_sessions_active_expiry_index',
  'anonymous_planning_profiles_session_active_unique',
  'anonymous_planning_profiles_retention_index',
  'anonymous_profile_events_session_created_index',
  'anonymous_profile_events_profile_created_index'
]]);

const healthyRows = [
  ['unis', 'id'],
  ['unis', 'title'],
  ['unis', 'address'],
  ['unis', 'desc'],
  ['unis', 'lat'],
  ['unis', 'long'],
  ['unis', 'created_at'],
  ['unis', 'updated_at'],
  ['muns', 'id'],
  ['muns', 'title'],
  ['muns', 'county'],
  ['muns', 'created_at'],
  ['muns', 'updated_at'],
  ['cdepts', 'id'],
  ['cdepts', 'cnaic'],
  ['cdepts', 'created_at'],
  ['cdepts', 'updated_at'],
  ['demo_sessions', 'id'],
  ['demo_sessions', 'public_id'],
  ['demo_sessions', 'display_name'],
  ['demo_sessions', 'municipality_id'],
  ['demo_sessions', 'category_id'],
  ['demo_sessions', 'profile'],
  ['demo_sessions', 'created_at'],
  ['demo_sessions', 'updated_at'],
  ['cbps', 'id'],
  ['cbps', 'total_indus'],
  ['cbps', 'total_anual'],
  ['cbps', 'cnaic'],
  ['cbps', 'cnaic_name'],
  ['cbps', 'county'],
  ['cbps', 'num_est'],
  ['cbps', 'created_at'],
  ['cbps', 'updated_at'],
  ['businesses', 'id'],
  ['businesses', 'cdepts_id'],
  ['businesses', 'lat'],
  ['businesses', 'long'],
  ['businesses', 'title'],
  ['businesses', 'address'],
  ['businesses', 'created_at'],
  ['businesses', 'updated_at'],
  ['grade_cs', 'id'],
  ['grade_cs', 'uni_id'],
  ['grade_cs', 'cdepts_id'],
  ['grade_cs', 'rate'],
  ['grade_cs', 'year'],
  ['grade_cs', 'created_at'],
  ['grade_cs', 'updated_at']
].map(function(row) {
  return {
    table_name: row[0],
    column_name: row[1]
  };
});

assert.deepStrictEqual(schemaContract.evaluate(healthyRows), {
  version: 'baseline-read-v1',
  ok: true,
  missing: []
});

const missing = schemaContract.evaluate(healthyRows.filter(function(row) {
  return row.table_name !== 'unis' || row.column_name !== 'title';
}));

assert.strictEqual(missing.ok, false);
assert(missing.missing.indexOf('unis.title') !== -1);

assert.deepStrictEqual(schemaContract.evaluateLoadIndexes([
  {
    tablename: 'cbps',
    indexname: 'cbps_county_cnaic_unique',
    indexdef: 'CREATE UNIQUE INDEX cbps_county_cnaic_unique ON public.cbps USING btree (county, cnaic)'
  },
  {
    tablename: 'muns',
    indexname: 'muns_county_unique',
    indexdef: 'CREATE UNIQUE INDEX muns_county_unique ON public.muns USING btree (county)'
  },
  {
    tablename: 'unis',
    indexname: 'unis_title_address_unique',
    indexdef: 'CREATE UNIQUE INDEX unis_title_address_unique ON public.unis USING btree (title, address)'
  }
]), {
  ok: true,
  missing: [],
  unavailable: false
});

assert.deepStrictEqual(schemaContract.evaluateLoadIndexes([
  {
    tablename: 'cbps',
    indexname: 'cbps_county_cnaic_unique',
    indexdef: 'CREATE INDEX cbps_county_cnaic_unique ON public.cbps USING btree (county, cnaic)'
  }
]), {
  ok: false,
  missing: [
    'cbps_county_cnaic_unique',
    'muns_county_unique',
    'unis_title_address_unique'
  ],
  unavailable: false
});

assert.deepStrictEqual(schemaContract.unavailableLoadIndexes(), {
  ok: false,
  missing: [
    'cbps_county_cnaic_unique',
    'muns_county_unique',
    'unis_title_address_unique'
  ],
  unavailable: true
});

const anonymousRows = [
  ['anonymous_sessions', 'id'],
  ['anonymous_sessions', 'public_id'],
  ['anonymous_sessions', 'token_hash'],
  ['anonymous_sessions', 'csrf_token_hash'],
  ['anonymous_sessions', 'created_at'],
  ['anonymous_sessions', 'last_seen_at'],
  ['anonymous_sessions', 'expires_at'],
  ['anonymous_sessions', 'rotated_at'],
  ['anonymous_sessions', 'revoked_at'],
  ['anonymous_sessions', 'revoke_reason'],
  ['anonymous_planning_profiles', 'id'],
  ['anonymous_planning_profiles', 'anonymous_session_id'],
  ['anonymous_planning_profiles', 'schema_version'],
  ['anonymous_planning_profiles', 'row_version'],
  ['anonymous_planning_profiles', 'profile'],
  ['anonymous_planning_profiles', 'created_at'],
  ['anonymous_planning_profiles', 'updated_at'],
  ['anonymous_planning_profiles', 'deleted_at'],
  ['anonymous_planning_profiles', 'deletion_requested_at'],
  ['anonymous_planning_profiles', 'export_requested_at'],
  ['anonymous_profile_events', 'id'],
  ['anonymous_profile_events', 'anonymous_session_id'],
  ['anonymous_profile_events', 'anonymous_profile_id'],
  ['anonymous_profile_events', 'event_name'],
  ['anonymous_profile_events', 'created_at'],
  ['anonymous_profile_events', 'metadata']
].map(function(row) {
  return {
    table_name: row[0],
    column_name: row[1]
  };
});

const anonymousIndexRows = [
  ['anonymous_sessions', 'anonymous_sessions_public_id_unique', 'CREATE UNIQUE INDEX anonymous_sessions_public_id_unique ON public.anonymous_sessions USING btree (public_id)'],
  ['anonymous_sessions', 'anonymous_sessions_token_hash_unique', 'CREATE UNIQUE INDEX anonymous_sessions_token_hash_unique ON public.anonymous_sessions USING btree (token_hash)'],
  ['anonymous_sessions', 'anonymous_sessions_active_expiry_index', 'CREATE INDEX anonymous_sessions_active_expiry_index ON public.anonymous_sessions USING btree (expires_at) WHERE revoked_at IS NULL'],
  ['anonymous_planning_profiles', 'anonymous_planning_profiles_session_active_unique', 'CREATE UNIQUE INDEX anonymous_planning_profiles_session_active_unique ON public.anonymous_planning_profiles USING btree (anonymous_session_id) WHERE deleted_at IS NULL'],
  ['anonymous_planning_profiles', 'anonymous_planning_profiles_retention_index', 'CREATE INDEX anonymous_planning_profiles_retention_index ON public.anonymous_planning_profiles USING btree (deleted_at, updated_at)'],
  ['anonymous_profile_events', 'anonymous_profile_events_session_created_index', 'CREATE INDEX anonymous_profile_events_session_created_index ON public.anonymous_profile_events USING btree (anonymous_session_id, created_at)'],
  ['anonymous_profile_events', 'anonymous_profile_events_profile_created_index', 'CREATE INDEX anonymous_profile_events_profile_created_index ON public.anonymous_profile_events USING btree (anonymous_profile_id, created_at)']
].map(function(row) {
  return {
    tablename: row[0],
    indexname: row[1],
    indexdef: row[2]
  };
});

assert.deepStrictEqual(schemaContract.evaluateAnonymous(anonymousRows, anonymousIndexRows), {
  version: 'anonymous-session-v1',
  ok: true,
  missing: [],
  indexes: {
    ok: true,
    missing: [],
    unavailable: false
  }
});

const missingAnonymous = schemaContract.evaluateAnonymous(anonymousRows.filter(function(row) {
  return row.table_name !== 'anonymous_sessions' || row.column_name !== 'token_hash';
}), anonymousIndexRows.slice(0, 1));
assert.strictEqual(missingAnonymous.ok, false);
assert(missingAnonymous.missing.indexOf('anonymous_sessions.token_hash') !== -1);
assert(missingAnonymous.indexes.missing.indexOf('anonymous_sessions_token_hash_unique') !== -1);

const wrongAnonymousIndexColumns = anonymousIndexRows.map(function(row) {
  if (row.indexname !== 'anonymous_sessions_token_hash_unique') {
    return row;
  }

  return {
    tablename: row.tablename,
    indexname: row.indexname,
    indexdef: 'CREATE UNIQUE INDEX anonymous_sessions_token_hash_unique ON public.anonymous_sessions USING btree (public_id)'
  };
});
const wrongAnonymousIndexStatus = schemaContract.evaluateAnonymous(anonymousRows, wrongAnonymousIndexColumns);
assert.strictEqual(wrongAnonymousIndexStatus.ok, false);
assert(wrongAnonymousIndexStatus.indexes.missing.indexOf('anonymous_sessions_token_hash_unique') !== -1);

const missingAnonymousIndexPredicate = anonymousIndexRows.map(function(row) {
  if (row.indexname !== 'anonymous_planning_profiles_session_active_unique') {
    return row;
  }

  return {
    tablename: row.tablename,
    indexname: row.indexname,
    indexdef: 'CREATE UNIQUE INDEX anonymous_planning_profiles_session_active_unique ON public.anonymous_planning_profiles USING btree (anonymous_session_id)'
  };
});
const missingAnonymousPredicateStatus = schemaContract.evaluateAnonymous(anonymousRows, missingAnonymousIndexPredicate);
assert.strictEqual(missingAnonymousPredicateStatus.ok, false);
assert(missingAnonymousPredicateStatus.indexes.missing.indexOf('anonymous_planning_profiles_session_active_unique') !== -1);
