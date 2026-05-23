'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var loadPlanBuilder = require('../scripts/data_load_plan');
var previewer = require('../scripts/data_sql_preview');

var planningReport = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json'), 'utf8'));
var policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-load-policy.json'), 'utf8'));
var timestamp = '2026-05-22T12:00:00.000Z';
var previewTimestamp = '2026-05-22T13:00:00.000Z';
var loadPlan = loadPlanBuilder.buildLoadPlan(planningReport, {
  timestamp: timestamp
});
var preview = previewer.buildSqlPreview(loadPlan, policy, {
  timestamp: previewTimestamp
});
var acknowledgedPreview = previewer.buildSqlPreview(loadPlan, policy, {
  acknowledgeSkipped: true,
  timestamp: previewTimestamp
});
var cbpStatement;
var munStatement;
var uniStatement;
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-sql-preview-'));
var loadPlanPath = path.join(tmpDir, 'load-plan.json');
var outPath = path.join(tmpDir, 'sql-preview.json');
var cliResult;
var failedResult;

assert.strictEqual(previewer.quoteIdentifier('desc'), '"desc"');
assert.throws(function() {
  previewer.quoteIdentifier('bad-name');
}, /Unsafe SQL identifier/);

assert.strictEqual(preview.schemaVersion, 1);
assert.strictEqual(preview.generatedAt, previewTimestamp);
assert.strictEqual(preview.dryRunOnly, true);
assert.strictEqual(preview.mutationAllowed, false);
assert.strictEqual(preview.sourceLoadPlanGeneratedAt, timestamp);
assert.strictEqual(preview.policyScope, 'puerto-rico-only');
assert.strictEqual(preview.writerStatus, 'not-implemented');
assert.strictEqual(preview.requiresOperatorApproval, true);
assert.strictEqual(preview.skippedAcknowledged, false);
assert.deepStrictEqual(preview.transaction, {
  mode: 'single-transaction',
  begin: 'BEGIN;',
  commit: 'COMMIT;',
  rollbackOnFailure: true
});
assert(preview.blockedReasons.indexOf('skipped records require explicit operator acknowledgement before write execution') !== -1);
assert.strictEqual(preview.statements.length, 3);
assert.deepStrictEqual(preview.summary.rows, {
  cbps: 1,
  muns: 1,
  unis: 1
});
assert.strictEqual(preview.summary.statementCount, 3);

assert.deepStrictEqual(acknowledgedPreview.blockedReasons, []);
assert.strictEqual(acknowledgedPreview.skippedAcknowledged, true);

cbpStatement = preview.statements.filter(function(statement) {
  return statement.table === 'cbps';
})[0];
munStatement = preview.statements.filter(function(statement) {
  return statement.table === 'muns';
})[0];
uniStatement = preview.statements.filter(function(statement) {
  return statement.table === 'unis';
})[0];

assert.strictEqual(
  cbpStatement.sql,
  'INSERT INTO "cbps" ("total_indus", "total_anual", "cnaic", "cnaic_name", "county", "num_est", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("county", "cnaic") DO UPDATE SET "total_indus" = EXCLUDED."total_indus", "total_anual" = EXCLUDED."total_anual", "cnaic_name" = EXCLUDED."cnaic_name", "num_est" = EXCLUDED."num_est", "updated_at" = EXCLUDED."updated_at";'
);
assert.deepStrictEqual(cbpStatement.params, [
  653,
  11348,
  541,
  'Professional Services',
  1,
  128,
  timestamp,
  timestamp
]);
assert.strictEqual(cbpStatement.sourceId, 'datospr-cbp-2014-municipios');
assert.strictEqual(cbpStatement.rowIndex, 0);
assert.deepStrictEqual(cbpStatement.provenance, loadPlan.rows.cbps[0].provenance);

assert.strictEqual(
  munStatement.sql,
  'INSERT INTO "muns" ("title", "county", "created_at", "updated_at") VALUES ($1, $2, $3, $4) ON CONFLICT ("county") DO UPDATE SET "title" = EXCLUDED."title", "updated_at" = EXCLUDED."updated_at";'
);

assert.strictEqual(
  uniStatement.sql,
  'INSERT INTO "unis" ("title", "address", "desc", "lat", "long", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("title", "address") DO UPDATE SET "desc" = EXCLUDED."desc", "lat" = EXCLUDED."lat", "long" = EXCLUDED."long", "updated_at" = EXCLUDED."updated_at";'
);
assert.deepStrictEqual(uniStatement.params, [
  'American University of Puerto Rico',
  'Carr # 2 KM 14.0, Barrio Hato Tejas, BAYAMON',
  'Juan Nazario Torres | (787) 620-2040 | www.aupr.edu | jcnazario@aupr.edu',
  18.407058,
  -66.186631,
  timestamp,
  timestamp
]);

fs.writeFileSync(loadPlanPath, JSON.stringify(loadPlan, null, 2));

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_sql_preview.js',
  '--load-plan=' + loadPlanPath,
  '--out=' + outPath,
  '--timestamp=' + previewTimestamp
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')), preview);

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_sql_preview.js'
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing required --load-plan=<path> argument') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
