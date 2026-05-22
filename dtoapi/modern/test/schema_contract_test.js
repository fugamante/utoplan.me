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
