'use strict';

var fs = require('fs');

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

function skippedCount(preview) {
  var skipped = (preview.summary || {}).skipped || {};

  return Number(skipped.rejected || 0) +
    Number(skipped.manualReview || 0) +
    Number(skipped.unsupportedCacheSources || 0);
}

function checkGate(preview, readiness, options) {
  var acknowledgeSkipped = options && options.acknowledgeSkipped;
  var blockedReasons = [];
  var checks;
  var result;

  if (!preview || preview.schemaVersion !== 1) {
    blockedReasons.push('SQL preview schemaVersion 1 is required');
  }

  if (!readiness || readiness.status !== 'ok' || readiness.database !== 'ok' || readiness.schema !== 'ok') {
    blockedReasons.push('API readiness must be ok before writer enablement');
  }

  if (!preview || !preview.dryRunOnly || preview.mutationAllowed) {
    blockedReasons.push('SQL preview must remain dry-run only with mutationAllowed=false');
  }

  if (!preview || preview.writerStatus !== 'not-implemented') {
    blockedReasons.push('load policy writerStatus must remain not-implemented for this gate');
  }

  if (!preview || preview.skippedAcknowledged !== true || !acknowledgeSkipped) {
    blockedReasons.push('skipped records must be explicitly acknowledged');
  }

  if (preview && skippedCount(preview) > 0 && !acknowledgeSkipped) {
    blockedReasons.push('non-empty skipped records require operator acknowledgement');
  }

  if (preview && (preview.blockedReasons || []).length > 0) {
    blockedReasons.push('SQL preview has unresolved blocked reasons');
  }

  if (!readiness || readiness.loadPolicyIndexes !== 'ok') {
    blockedReasons.push('load-policy indexes must be visible in API readiness');
  }

  checks = {
    apiReady: !!readiness && readiness.status === 'ok' && readiness.database === 'ok' && readiness.schema === 'ok',
    previewDryRunOnly: !!preview && preview.dryRunOnly === true && preview.mutationAllowed === false,
    writerStatusGuarded: !!preview && preview.writerStatus === 'not-implemented',
    skippedAcknowledged: !!preview && preview.skippedAcknowledged === true && !!acknowledgeSkipped,
    previewUnblocked: !!preview && (preview.blockedReasons || []).length === 0,
    loadPolicyIndexesVisible: !!readiness && readiness.loadPolicyIndexes === 'ok'
  };

  result = {
    schemaVersion: 1,
    writerEnabled: false,
    writerEnablementAllowed: blockedReasons.length === 0,
    checks: checks,
    blockedReasons: blockedReasons,
    missingLoadPolicyIndexes: readiness && readiness.missingLoadPolicyIndexes ? readiness.missingLoadPolicyIndexes : []
  };

  return result;
}

function run(args) {
  var previewPath = readArg(args, 'sql-preview', null);
  var readinessPath = readArg(args, 'readyz', null);
  var outPath = readArg(args, 'out', null);
  var result;

  if (!previewPath) {
    console.error('Missing required --sql-preview=<path> argument');
    return 1;
  }

  if (!readinessPath) {
    console.error('Missing required --readyz=<path> argument');
    return 1;
  }

  try {
    result = checkGate(readJsonFile(previewPath), readJsonFile(readinessPath), {
      acknowledgeSkipped: hasFlag(args, 'acknowledge-skipped')
    });
  } catch (error) {
    console.error('Failed to check writer gate: ' + error.message);
    return 1;
  }

  try {
    if (outPath) {
      writeJsonFile(outPath, result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write writer gate result: ' + error.message);
    return 1;
  }

  if (!result.writerEnablementAllowed) {
    console.error('Writer enablement blocked: ' + result.blockedReasons.join('; '));
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  checkGate: checkGate,
  run: run
};
