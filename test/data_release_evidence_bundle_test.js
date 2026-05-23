'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var bundle = require('../scripts/data_release_evidence_bundle');

var root = path.join(__dirname, '..');
var readyz = {
  status: 'ok',
  service: 'utoplan-modern-api',
  database: 'ok',
  schema: 'ok',
  schemaVersion: 'baseline-read-v1',
  loadPolicyIndexes: 'ok',
  missingLoadPolicyIndexes: []
};
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-release-evidence-'));
var readyzPath = path.join(tmpDir, 'readyz.json');
var outDir = path.join(tmpDir, 'bundle');
var blockedReadyzPath = path.join(tmpDir, 'blocked-readyz.json');
var blockedOutDir = path.join(tmpDir, 'blocked-bundle');
var built;
var cliResult;
var failedResult;
var manifest;

fs.writeFileSync(readyzPath, JSON.stringify(readyz, null, 2));
fs.writeFileSync(blockedReadyzPath, JSON.stringify(Object.assign({}, readyz, {
  loadPolicyIndexes: 'missing',
  missingLoadPolicyIndexes: ['unis_title_address_unique']
}), null, 2));

built = bundle.buildBundle({
  fixturesPath: path.join(root, 'data', 'fixtures', 'non-production', 'import-plan-fixtures.json'),
  policyPath: path.join(root, 'data', 'mappings', 'puerto-rico-load-policy.json'),
  approvalContractPath: path.join(root, 'data', 'mappings', 'puerto-rico-operator-approval-contract.json'),
  readyzPath: readyzPath,
  acknowledgeSkipped: true,
  timestamp: '2026-05-22T12:00:00.000Z',
  previewTimestamp: '2026-05-22T13:00:00.000Z',
  generatedAt: '2026-05-22T14:00:00.000Z',
  approvedBy: 'Release Operations',
  approvedAt: '2026-05-22T14:00:00.000Z',
  approvalReason: 'Reviewed skipped Puerto Rico data records for release evidence.'
});

assert.strictEqual(built.manifest.status, 'complete');
assert.strictEqual(built.manifest.mutationAllowed, false);
assert.strictEqual(built.writerGate.writerEnabled, false);
assert.strictEqual(built.writerGate.writerEnablementAllowed, true);
assert.strictEqual(built.approvalValidation.approvalValid, true);
assert.deepStrictEqual(built.operatorApproval.skippedSummary, built.sqlPreview.summary.skipped);
assert.deepStrictEqual(built.manifest.artifacts, [
  'planning-report.json',
  'load-plan.json',
  'sql-preview.json',
  'writer-gate.json',
  'operator-approval.json',
  'operator-approval-validation.json'
]);

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_release_evidence_bundle.js',
  '--readyz=' + readyzPath,
  '--out-dir=' + outDir,
  '--acknowledge-skipped',
  '--generated-at=2026-05-22T14:00:00.000Z',
  '--approved-at=2026-05-22T14:00:00.000Z'
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.status, 'complete');
assert.strictEqual(manifest.mutationAllowed, false);
built.manifest.artifacts.concat(['manifest.json']).forEach(function(fileName) {
  assert(fs.existsSync(path.join(outDir, fileName)), fileName + ' should be written');
});
assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(outDir, 'operator-approval-validation.json'), 'utf8')), {
  schemaVersion: 1,
  approvalValid: true,
  mutationAllowed: false,
  errors: []
});

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_release_evidence_bundle.js',
  '--readyz=' + readyzPath,
  '--out-dir=' + path.join(tmpDir, 'missing-ack')
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing required --acknowledge-skipped flag') !== -1);

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/data_release_evidence_bundle.js',
  '--readyz=' + blockedReadyzPath,
  '--out-dir=' + blockedOutDir,
  '--acknowledge-skipped'
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(fs.existsSync(path.join(blockedOutDir, 'manifest.json')));
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(blockedOutDir, 'manifest.json'), 'utf8')).status, 'blocked');

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
