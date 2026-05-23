'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var loadPlanBuilder = require('../scripts/data_load_plan');
var previewer = require('../scripts/data_sql_preview');
var gate = require('../scripts/data_writer_gate');
var validator = require('../scripts/data_operator_approval_validate');

var root = path.join(__dirname, '..');
var planningReport = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fixtures', 'non-production', 'import-plan-report.json'), 'utf8'));
var policy = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-load-policy.json'), 'utf8'));
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'puerto-rico-operator-approval-contract.json'), 'utf8'));
var loadPlan = loadPlanBuilder.buildLoadPlan(planningReport, {
  timestamp: '2026-05-22T12:00:00.000Z'
});
var preview = previewer.buildSqlPreview(loadPlan, policy, {
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
var writerGate = gate.checkGate(preview, readyz, {
  acknowledgeSkipped: true
});
var approval = {
  schemaVersion: 1,
  scope: 'puerto-rico-only',
  approvedBy: 'Release Operations',
  approvedAt: '2026-05-23T12:00:00.000Z',
  approvalReason: 'Reviewed skipped Puerto Rico data records for release evidence.',
  skippedAcknowledged: true,
  skippedSummary: preview.summary.skipped,
  sourceArtifacts: {
    loadPlanGeneratedAt: preview.sourceLoadPlanGeneratedAt,
    sqlPreviewGeneratedAt: preview.generatedAt,
    writerGateSchemaVersion: writerGate.schemaVersion
  },
  acknowledgements: contract.requiredAcknowledgements.slice()
};
var valid = validator.validateApproval(approval, preview, writerGate, contract);
var mismatchedApproval = Object.assign({}, approval, {
  skippedSummary: {
    rejected: 0,
    manualReview: 0,
    unsupportedCacheSources: 0
  }
});
var forbiddenApproval = Object.assign({}, approval, {
  token: 'not-for-release-artifacts'
});
var missingAcknowledgementApproval = Object.assign({}, approval, {
  acknowledgements: approval.acknowledgements.slice(1)
});
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-operator-approval-'));
var approvalPath = path.join(tmpDir, 'approval.json');
var previewPath = path.join(tmpDir, 'preview.json');
var gatePath = path.join(tmpDir, 'writer-gate.json');
var outPath = path.join(tmpDir, 'approval-validation.json');
var cliResult;
var failedResult;

assert.deepStrictEqual(valid, {
  schemaVersion: 1,
  approvalValid: true,
  mutationAllowed: false,
  errors: []
});

assert(validator.validateApproval(mismatchedApproval, preview, writerGate, contract).errors.indexOf('approval skippedSummary must match sqlPreview.summary.skipped') !== -1);
assert(validator.validateApproval(forbiddenApproval, preview, writerGate, contract).errors.indexOf('approval contains forbidden field token') !== -1);
assert(validator.validateApproval(missingAcknowledgementApproval, preview, writerGate, contract).errors.some(function(error) {
  return error.indexOf('approval missing acknowledgement') === 0;
}));

fs.writeFileSync(approvalPath, JSON.stringify(approval, null, 2));
fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));
fs.writeFileSync(gatePath, JSON.stringify(writerGate, null, 2));

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_operator_approval_validate.js',
  '--approval=' + approvalPath,
  '--sql-preview=' + previewPath,
  '--writer-gate=' + gatePath,
  '--out=' + outPath
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')), valid);

fs.writeFileSync(approvalPath, JSON.stringify(forbiddenApproval, null, 2));

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_operator_approval_validate.js',
  '--approval=' + approvalPath,
  '--sql-preview=' + previewPath,
  '--writer-gate=' + gatePath
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Operator approval validation failed') !== -1);
assert(JSON.parse(failedResult.stdout).errors.indexOf('approval contains forbidden field token') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
