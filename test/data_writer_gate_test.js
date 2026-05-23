'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var loadPlanBuilder = require('../scripts/data_load_plan');
var previewer = require('../scripts/data_sql_preview');
var gate = require('../scripts/data_writer_gate');

var planningReport = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json'), 'utf8'));
var policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-load-policy.json'), 'utf8'));
var loadPlan = loadPlanBuilder.buildLoadPlan(planningReport, {
  timestamp: '2026-05-22T12:00:00.000Z'
});
var blockedPreview = previewer.buildSqlPreview(loadPlan, policy, {
  timestamp: '2026-05-22T13:00:00.000Z'
});
var acknowledgedPreview = previewer.buildSqlPreview(loadPlan, policy, {
  acknowledgeSkipped: true,
  timestamp: '2026-05-22T13:00:00.000Z'
});
var readyz = {
  status: 'ok',
  service: 'utoplan-modern-api',
  database: 'ok',
  schema: 'ok',
  schemaVersion: 'baseline-read-v1',
  loadPolicyIndexes: 'ok',
  missingLoadPolicyIndexes: []
};
var missingIndexesReadyz = Object.assign({}, readyz, {
  loadPolicyIndexes: 'missing',
  missingLoadPolicyIndexes: ['unis_title_address_unique']
});
var allowed = gate.checkGate(acknowledgedPreview, readyz, {
  acknowledgeSkipped: true
});
var blocked = gate.checkGate(blockedPreview, missingIndexesReadyz, {});
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-writer-gate-'));
var previewPath = path.join(tmpDir, 'preview.json');
var readyzPath = path.join(tmpDir, 'readyz.json');
var outPath = path.join(tmpDir, 'writer-gate.json');
var cliResult;
var failedResult;

assert.deepStrictEqual(allowed, {
  schemaVersion: 1,
  writerEnabled: false,
  writerEnablementAllowed: true,
  checks: {
    apiReady: true,
    previewDryRunOnly: true,
    writerStatusGuarded: true,
    skippedAcknowledged: true,
    previewUnblocked: true,
    loadPolicyIndexesVisible: true
  },
  blockedReasons: [],
  missingLoadPolicyIndexes: []
});

assert.strictEqual(blocked.writerEnabled, false);
assert.strictEqual(blocked.writerEnablementAllowed, false);
assert.strictEqual(blocked.checks.skippedAcknowledged, false);
assert.strictEqual(blocked.checks.loadPolicyIndexesVisible, false);
assert(blocked.blockedReasons.indexOf('skipped records must be explicitly acknowledged') !== -1);
assert(blocked.blockedReasons.indexOf('SQL preview has unresolved blocked reasons') !== -1);
assert(blocked.blockedReasons.indexOf('load-policy indexes must be visible in API readiness') !== -1);
assert.deepStrictEqual(blocked.missingLoadPolicyIndexes, ['unis_title_address_unique']);
assert.strictEqual(gate.checkGate(null, readyz, {
  acknowledgeSkipped: true
}).writerEnablementAllowed, false);

fs.writeFileSync(previewPath, JSON.stringify(acknowledgedPreview, null, 2));
fs.writeFileSync(readyzPath, JSON.stringify(readyz, null, 2));

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_writer_gate.js',
  '--sql-preview=' + previewPath,
  '--readyz=' + readyzPath,
  '--acknowledge-skipped',
  '--out=' + outPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')), allowed);

fs.writeFileSync(previewPath, JSON.stringify(blockedPreview, null, 2));
fs.writeFileSync(readyzPath, JSON.stringify(missingIndexesReadyz, null, 2));

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_writer_gate.js',
  '--sql-preview=' + previewPath,
  '--readyz=' + readyzPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Writer enablement blocked') !== -1);
assert(JSON.parse(failedResult.stdout).blockedReasons.indexOf('load-policy indexes must be visible in API readiness') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
