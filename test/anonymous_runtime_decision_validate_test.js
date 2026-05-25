'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var validator = require('../scripts/anonymous_runtime_decision_validate');

var root = path.join(__dirname, '..');
var contract = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mappings', 'anonymous-runtime-production-decision-contract.json'), 'utf8'));
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-anon-decision-'));
var decisionPath = path.join(tmpDir, 'decision.json');
var outPath = path.join(tmpDir, 'validation.json');

function validDecision(overrides) {
  return Object.assign({
    schemaVersion: 1,
    scope: 'anonymous-runtime-production',
    decisionStatus: 'approved-for-activation',
    decisionBy: 'Release Operations',
    decidedAt: '2026-05-25T12:00:00.000Z',
    targetEnvironment: 'production',
    targetOrigin: 'https://app.example.com',
    hostingTopology: {
      publicEntry: 'public-app-or-edge',
      apiPrivate: true,
      postgresPrivate: true,
      apiDirectPublicAccess: false,
      sameOriginAppProxy: true
    },
    runtimeGate: {
      UTOPLAN_ANONYMOUS_RUNTIME: '1',
      UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS: ['https://app.example.com'],
      UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'shared'
    },
    migrationEvidence: {
      anonymousStorageMigrationApplied: true,
      sharedLimiterMigrationApplied: true,
      anonymousSchemaReady: true,
      baselineReadyzUnchanged: true
    },
    limiterEvidence: {
      mode: 'shared',
      attested: true,
      scopeEvidence: 'Shared Postgres limiter covers session, profile, and failure scopes.',
      failClosedBehaviorReviewed: true
    },
    proxyEvidence: {
      trustedClientIpVerified: true,
      forwardingHeadersStripped: true,
      attackerSuppliedHeaderSmokePassed: true
    },
    smokeEvidence: {
      releaseSmokePassed: true,
      anonymousSmokePassed: true,
      negativeCorsCsrfChecksPassed: true
    },
    backupRestoreEvidence: {
      backupIdentifier: 'release-backup-20260525',
      backupTimestamp: '2026-05-25T11:30:00.000Z',
      restoreProcedureLocation: 'release evidence bundle',
      reviewed: true
    },
    rollbackEvidence: {
      activationGateDisablement: true,
      sharedOrEdgeLimiterFallback: true,
      noDropAfterProductionWrites: true,
      dataPreservingRollbackReviewed: true
    },
    acknowledgements: contract.requiredAcknowledgements.slice()
  }, overrides || {});
}

function resultFor(decision) {
  return validator.validateDecision(decision, contract);
}

var complete = resultFor(validDecision());
assert.strictEqual(complete.status, 'complete');
assert.strictEqual(complete.activationAllowed, true);
assert.deepStrictEqual(complete.blockedReasons, []);

var blocked = resultFor(validDecision({
  smokeEvidence: {
    releaseSmokePassed: true,
    anonymousSmokePassed: false,
    negativeCorsCsrfChecksPassed: true
  }
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.some(function(reason) {
  return reason.indexOf('smokeEvidence.anonymousSmokePassed') !== -1;
}));

blocked = resultFor(validDecision({
  decisionBy: 'operator@example.com'
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.some(function(reason) {
  return reason.indexOf('personal email') !== -1;
}));

blocked = resultFor(validDecision({
  hostingTopology: {
    publicEntry: 'public-app-or-edge',
    apiPrivate: true,
    postgresPrivate: true,
    apiDirectPublicAccess: true,
    sameOriginAppProxy: true
  }
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.indexOf('hostingTopology.apiDirectPublicAccess must be false') !== -1);

blocked = resultFor(validDecision({
  rollbackEvidence: {
    activationGateDisablement: true,
    sharedOrEdgeLimiterFallback: true,
    noDropAfterProductionWrites: false,
    dataPreservingRollbackReviewed: true
  }
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.some(function(reason) {
  return reason.indexOf('rollbackEvidence.noDropAfterProductionWrites') !== -1;
}));

blocked = resultFor(validDecision({
  DATABASE_URL: 'postgres://secret.example.invalid/db'
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.indexOf('decision contains forbidden field DATABASE_URL') !== -1);

blocked = resultFor(validDecision({
  runtimeGate: {
    UTOPLAN_ANONYMOUS_RUNTIME: '1',
    UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS: ['https://app.example.com'],
    UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: 'edge'
  },
  migrationEvidence: {
    anonymousStorageMigrationApplied: true,
    sharedLimiterMigrationApplied: false,
    anonymousSchemaReady: true,
    baselineReadyzUnchanged: true
  },
  limiterEvidence: {
    mode: 'edge',
    attested: true,
    scopeEvidence: 'Edge limiter covers anonymous scopes before API access.',
    failClosedBehaviorReviewed: true
  }
}));
assert.strictEqual(blocked.status, 'blocked');
assert(blocked.blockedReasons.indexOf('edge limiter mode requires limiterEvidence.edgePolicyEvidence') !== -1);

fs.writeFileSync(decisionPath, JSON.stringify(validDecision(), null, 2));
var cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/anonymous_runtime_decision_validate.js',
  '--decision=' + decisionPath,
  '--out=' + outPath
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.strictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')).status, 'complete');

var failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/anonymous_runtime_decision_validate.js'
], {
  cwd: root,
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing required --decision=<path> argument') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
