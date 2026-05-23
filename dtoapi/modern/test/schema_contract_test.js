'use strict';

const assert = require('assert');
const schemaContract = require('../lib/schema_contract');

assert.strictEqual(schemaContract.BASELINE_SCHEMA_VERSION, 'baseline-read-v1');
assert.deepStrictEqual(schemaContract.expectedTables(), [
  'businesses',
  'cbps',
  'cdepts',
  'grade_cs',
  'muns',
  'unis'
]);
assert(schemaContract.statusQuery().indexOf('information_schema.columns') !== -1);
assert.deepStrictEqual(schemaContract.statusParams(), [[
  'businesses',
  'cbps',
  'cdepts',
  'grade_cs',
  'muns',
  'unis'
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
