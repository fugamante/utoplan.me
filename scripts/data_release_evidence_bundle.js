'use strict';

var fs = require('fs');
var path = require('path');
var importPlanner = require('./data_import_plan');
var loadPlanner = require('./data_load_plan');
var previewer = require('./data_sql_preview');
var gate = require('./data_writer_gate');
var approvalValidator = require('./data_operator_approval_validate');

function readArg(args, name, defaultValue) {
  var prefix = '--' + name + '=';
  var value = defaultValue;

  args.forEach(function(arg) {
    if (arg.indexOf(prefix) === 0) {
      value = arg.slice(prefix.length);
    }
  });

  return value;
}

function hasFlag(args, name) {
  return args.indexOf('--' + name) !== -1;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, {
    recursive: true
  });
}

function buildApproval(preview, writerGate, contract, options) {
  return {
    schemaVersion: 1,
    scope: contract.scope,
    approvedBy: options.approvedBy,
    approvedAt: options.approvedAt,
    approvalReason: options.approvalReason,
    skippedAcknowledged: true,
    skippedSummary: preview.summary.skipped,
    sourceArtifacts: {
      loadPlanGeneratedAt: preview.sourceLoadPlanGeneratedAt,
      sqlPreviewGeneratedAt: preview.generatedAt,
      writerGateSchemaVersion: writerGate.schemaVersion
    },
    acknowledgements: contract.requiredAcknowledgements.slice()
  };
}

function buildBundle(options) {
  var fixtures = readJsonFile(options.fixturesPath);
  var policy = readJsonFile(options.policyPath);
  var readyz = readJsonFile(options.readyzPath);
  var approvalContract = readJsonFile(options.approvalContractPath);
  var planningReport = importPlanner.planFixtureRows(fixtures);
  var loadPlan = loadPlanner.buildLoadPlan(planningReport, {
    timestamp: options.timestamp
  });
  var sqlPreview = previewer.buildSqlPreview(loadPlan, policy, {
    acknowledgeSkipped: options.acknowledgeSkipped,
    timestamp: options.previewTimestamp
  });
  var writerGate = gate.checkGate(sqlPreview, readyz, {
    acknowledgeSkipped: options.acknowledgeSkipped
  });
  var approval = buildApproval(sqlPreview, writerGate, approvalContract, options);
  var approvalValidation = approvalValidator.validateApproval(approval, sqlPreview, writerGate, approvalContract);

  return {
    planningReport: planningReport,
    loadPlan: loadPlan,
    sqlPreview: sqlPreview,
    writerGate: writerGate,
    operatorApproval: approval,
    approvalValidation: approvalValidation,
    manifest: {
      schemaVersion: 1,
      generatedAt: options.generatedAt,
      mutationAllowed: false,
      artifacts: [
        'planning-report.json',
        'load-plan.json',
        'sql-preview.json',
        'writer-gate.json',
        'operator-approval.json',
        'operator-approval-validation.json'
      ],
      status: writerGate.writerEnablementAllowed && approvalValidation.approvalValid ? 'complete' : 'blocked',
      blockedReasons: writerGate.blockedReasons.concat(approvalValidation.errors)
    }
  };
}

function writeBundle(outDir, bundle) {
  ensureDir(outDir);
  writeJsonFile(path.join(outDir, 'planning-report.json'), bundle.planningReport);
  writeJsonFile(path.join(outDir, 'load-plan.json'), bundle.loadPlan);
  writeJsonFile(path.join(outDir, 'sql-preview.json'), bundle.sqlPreview);
  writeJsonFile(path.join(outDir, 'writer-gate.json'), bundle.writerGate);
  writeJsonFile(path.join(outDir, 'operator-approval.json'), bundle.operatorApproval);
  writeJsonFile(path.join(outDir, 'operator-approval-validation.json'), bundle.approvalValidation);
  writeJsonFile(path.join(outDir, 'manifest.json'), bundle.manifest);
}

function run(args) {
  var outDir = readArg(args, 'out-dir', null);
  var options;
  var bundle;

  if (!outDir) {
    console.error('Missing required --out-dir=<path> argument');
    return 1;
  }

  if (!readArg(args, 'readyz', null)) {
    console.error('Missing required --readyz=<path> argument');
    return 1;
  }

  if (!hasFlag(args, 'acknowledge-skipped')) {
    console.error('Missing required --acknowledge-skipped flag');
    return 1;
  }

  options = {
    fixturesPath: readArg(args, 'fixtures', 'data/fixtures/non-production/import-plan-fixtures.json'),
    policyPath: readArg(args, 'policy', 'data/mappings/puerto-rico-load-policy.json'),
    approvalContractPath: readArg(args, 'approval-contract', 'data/mappings/puerto-rico-operator-approval-contract.json'),
    readyzPath: readArg(args, 'readyz', null),
    acknowledgeSkipped: true,
    timestamp: readArg(args, 'timestamp', '2026-05-22T12:00:00.000Z'),
    previewTimestamp: readArg(args, 'preview-timestamp', '2026-05-22T13:00:00.000Z'),
    generatedAt: readArg(args, 'generated-at', '2026-05-22T14:00:00.000Z'),
    approvedBy: readArg(args, 'approved-by', 'Release Operations'),
    approvedAt: readArg(args, 'approved-at', '2026-05-22T14:00:00.000Z'),
    approvalReason: readArg(args, 'approval-reason', 'Reviewed skipped Puerto Rico data records for release evidence.')
  };

  try {
    bundle = buildBundle(options);
    writeBundle(outDir, bundle);
  } catch (error) {
    console.error('Failed to build release evidence bundle: ' + error.message);
    return 1;
  }

  process.stdout.write(JSON.stringify(bundle.manifest, null, 2) + '\n');

  if (bundle.manifest.status !== 'complete') {
    console.error('Release evidence bundle blocked: ' + bundle.manifest.blockedReasons.join('; '));
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  buildApproval: buildApproval,
  buildBundle: buildBundle,
  run: run
};
