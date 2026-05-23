'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var loader = require('../scripts/data_load_plan');

var planningReport = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json'), 'utf8'));
var timestamp = '2026-05-22T12:00:00.000Z';
var loadPlan = loader.buildLoadPlan(planningReport, {
  timestamp: timestamp
});
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-data-load-'));
var planPath = path.join(tmpDir, 'plan.json');
var outPath = path.join(tmpDir, 'load-plan.json');
var cliResult;
var failedResult;

assert.deepStrictEqual(loadPlan.summary, {
  rows: {
    cbps: 1,
    muns: 1,
    unis: 1
  },
  skipped: {
    rejected: 2,
    manualReview: 2,
    unsupportedCacheSources: 0
  }
});

assert.strictEqual(loadPlan.provenanceContract, 'data/mappings/puerto-rico-provenance-confidence.json');
assert.deepStrictEqual(loadPlan.rows.cbps[0].provenance, {
  sourceId: 'datospr-cbp-2014-municipios',
  rowIndex: 0,
  sourceConfidence: 'medium',
  transformConfidence: 'low',
  productionReadiness: 'candidate-needs-review',
  sourceBacked: true,
  notes: 'Municipality-level CBP data is Puerto Rico-scoped, but important legacy field semantics are still unresolved.'
});
assert.strictEqual(loadPlan.rows.muns[0].provenance.transformConfidence, 'medium');
assert.strictEqual(loadPlan.rows.unis[0].provenance.transformConfidence, 'low');

assert.deepStrictEqual(loadPlan.rows.cbps[0].record, {
  total_indus: 653,
  total_anual: 11348,
  cnaic: 541,
  cnaic_name: 'Professional Services',
  county: 1,
  num_est: 128,
  created_at: timestamp,
  updated_at: timestamp
});

assert.deepStrictEqual(loadPlan.rows.muns[0].record, {
  title: 'San Juan',
  county: 127,
  created_at: timestamp,
  updated_at: timestamp
});

assert.deepStrictEqual(loadPlan.rows.unis[0].record, {
  title: 'American University of Puerto Rico',
  address: 'Carr # 2 KM 14.0, Barrio Hato Tejas, BAYAMON',
  desc: 'Juan Nazario Torres | (787) 620-2040 | www.aupr.edu | jcnazario@aupr.edu',
  lat: 18.407058,
  long: -66.186631,
  created_at: timestamp,
  updated_at: timestamp
});

assert.strictEqual(loadPlan.skipped.rejected.length, planningReport.rejected.length);
assert.strictEqual(loadPlan.skipped.manualReview.length, planningReport.manualReview.length);
assert.deepStrictEqual(loader.rowProvenance({
  table: 'businesses',
  sourceId: 'missing-source',
  rowIndex: 99
}, {
  tableAssessments: []
}), {
  sourceId: 'missing-source',
  rowIndex: 99,
  sourceConfidence: 'blocked',
  transformConfidence: 'blocked',
  productionReadiness: 'blocked',
  sourceBacked: false,
  notes: 'No provenance confidence assessment exists for this table.'
});

fs.writeFileSync(planPath, JSON.stringify(planningReport, null, 2));

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_load_plan.js',
  '--plan=' + planPath,
  '--out=' + outPath,
  '--timestamp=' + timestamp
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')), loadPlan);

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_load_plan.js'
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing required --plan=<path> argument') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
