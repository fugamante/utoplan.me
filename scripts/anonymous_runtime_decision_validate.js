'use strict';

var fs = require('fs');
var URL = require('url').URL;

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

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function isIsoTimestamp(value) {
  var time = Date.parse(value);

  return typeof value === 'string' &&
    !Number.isNaN(time) &&
    new Date(time).toISOString() === value;
}

function isHttpOrigin(value) {
  var parsed;

  try {
    parsed = new URL(value);
  } catch (error) {
    return false;
  }

  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.pathname === '/' &&
    parsed.search === '' &&
    parsed.hash === '';
}

function collectForbiddenFields(value, forbiddenFields, prefix, results) {
  if (!value || typeof value !== 'object') {
    return results;
  }

  Object.keys(value).forEach(function(key) {
    var path = prefix ? prefix + '.' + key : key;

    if (forbiddenFields.indexOf(key) !== -1) {
      results.push(path);
    }

    collectForbiddenFields(value[key], forbiddenFields, path, results);
  });

  return results;
}

function pushMissing(errors, value, field, label) {
  if (!value || !Object.prototype.hasOwnProperty.call(value, field)) {
    errors.push(label + ' missing required field ' + field);
  }
}

function requireFields(errors, value, fields, label) {
  fields.forEach(function(field) {
    pushMissing(errors, value, field, label);
  });
}

function mustBeTrue(errors, value, field, label) {
  if (!value || value[field] !== true) {
    errors.push(label + '.' + field + ' must be true');
  }
}

function validateDecision(decision, contract) {
  var errors = [];
  var mode = decision && decision.runtimeGate ? decision.runtimeGate.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE : null;
  var forbidden;

  requireFields(errors, decision, contract.requiredFields || [], 'decision');

  if (!decision || decision.schemaVersion !== contract.fieldRules.schemaVersion.equals) {
    errors.push('decision schemaVersion must be ' + contract.fieldRules.schemaVersion.equals);
  }

  if (!decision || decision.scope !== contract.fieldRules.scope.equals) {
    errors.push('decision scope must be ' + contract.fieldRules.scope.equals);
  }

  if (!decision || contract.fieldRules.decisionStatus.allowedValues.indexOf(decision.decisionStatus) === -1) {
    errors.push('decisionStatus must be an allowed value');
  }

  if (!decision || typeof decision.decisionBy !== 'string' || decision.decisionBy.trim() === '') {
    errors.push('decisionBy must be a non-empty neutral operator label');
  } else if (decision.decisionBy.indexOf('@') !== -1) {
    errors.push('decisionBy must not contain personal email-style identifiers');
  }

  if (!decision || !isIsoTimestamp(decision.decidedAt)) {
    errors.push('decidedAt must be an ISO-8601 UTC timestamp');
  }

  if (!decision || typeof decision.targetEnvironment !== 'string' || decision.targetEnvironment.trim() === '') {
    errors.push('targetEnvironment must be a non-empty string');
  }

  if (!decision || !isHttpOrigin(decision.targetOrigin)) {
    errors.push('targetOrigin must be an http or https origin');
  }

  requireFields(errors, decision && decision.hostingTopology, contract.fieldRules.hostingTopology.requiredFields, 'hostingTopology');
  requireFields(errors, decision && decision.runtimeGate, contract.fieldRules.runtimeGate.requiredFields, 'runtimeGate');
  requireFields(errors, decision && decision.migrationEvidence, contract.fieldRules.migrationEvidence.requiredFields, 'migrationEvidence');
  requireFields(errors, decision && decision.limiterEvidence, contract.fieldRules.limiterEvidence.requiredFields, 'limiterEvidence');
  requireFields(errors, decision && decision.proxyEvidence, contract.fieldRules.proxyEvidence.requiredFields, 'proxyEvidence');
  requireFields(errors, decision && decision.smokeEvidence, contract.fieldRules.smokeEvidence.requiredFields, 'smokeEvidence');
  requireFields(errors, decision && decision.backupRestoreEvidence, contract.fieldRules.backupRestoreEvidence.requiredFields, 'backupRestoreEvidence');
  requireFields(errors, decision && decision.rollbackEvidence, contract.fieldRules.rollbackEvidence.requiredFields, 'rollbackEvidence');

  if (decision && decision.hostingTopology) {
    mustBeTrue(errors, decision.hostingTopology, 'apiPrivate', 'hostingTopology');
    mustBeTrue(errors, decision.hostingTopology, 'postgresPrivate', 'hostingTopology');
    mustBeTrue(errors, decision.hostingTopology, 'sameOriginAppProxy', 'hostingTopology');
    if (decision.hostingTopology.apiDirectPublicAccess !== false) {
      errors.push('hostingTopology.apiDirectPublicAccess must be false');
    }
  }

  if (decision && decision.runtimeGate) {
    if (decision.runtimeGate.UTOPLAN_ANONYMOUS_RUNTIME !== '1') {
      errors.push('runtimeGate.UTOPLAN_ANONYMOUS_RUNTIME must be 1');
    }
    if (!Array.isArray(decision.runtimeGate.UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS) || decision.runtimeGate.UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS.length === 0) {
      errors.push('runtimeGate.UTOPLAN_ANONYMOUS_ALLOWED_ORIGINS must be a non-empty array');
    }
    if (mode !== 'shared' && mode !== 'edge') {
      errors.push('runtimeGate.UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE must be shared or edge');
    }
  }

  if (decision && decision.migrationEvidence) {
    mustBeTrue(errors, decision.migrationEvidence, 'anonymousStorageMigrationApplied', 'migrationEvidence');
    mustBeTrue(errors, decision.migrationEvidence, 'anonymousSchemaReady', 'migrationEvidence');
    mustBeTrue(errors, decision.migrationEvidence, 'baselineReadyzUnchanged', 'migrationEvidence');
    if (mode === 'shared') {
      mustBeTrue(errors, decision.migrationEvidence, 'sharedLimiterMigrationApplied', 'migrationEvidence');
    }
  }

  if (decision && decision.limiterEvidence) {
    if (decision.limiterEvidence.mode !== mode) {
      errors.push('limiterEvidence.mode must match runtime gate mode');
    }
    mustBeTrue(errors, decision.limiterEvidence, 'attested', 'limiterEvidence');
    mustBeTrue(errors, decision.limiterEvidence, 'failClosedBehaviorReviewed', 'limiterEvidence');
    if (typeof decision.limiterEvidence.scopeEvidence !== 'string' || decision.limiterEvidence.scopeEvidence.length < 12) {
      errors.push('limiterEvidence.scopeEvidence must describe reviewed limiter scopes');
    }
    if (mode === 'edge' && !decision.limiterEvidence.edgePolicyEvidence) {
      errors.push('edge limiter mode requires limiterEvidence.edgePolicyEvidence');
    }
  }

  if (decision && decision.proxyEvidence) {
    mustBeTrue(errors, decision.proxyEvidence, 'trustedClientIpVerified', 'proxyEvidence');
    mustBeTrue(errors, decision.proxyEvidence, 'forwardingHeadersStripped', 'proxyEvidence');
    mustBeTrue(errors, decision.proxyEvidence, 'attackerSuppliedHeaderSmokePassed', 'proxyEvidence');
  }

  if (decision && decision.smokeEvidence) {
    mustBeTrue(errors, decision.smokeEvidence, 'releaseSmokePassed', 'smokeEvidence');
    mustBeTrue(errors, decision.smokeEvidence, 'anonymousSmokePassed', 'smokeEvidence');
    mustBeTrue(errors, decision.smokeEvidence, 'negativeCorsCsrfChecksPassed', 'smokeEvidence');
  }

  if (decision && decision.backupRestoreEvidence) {
    mustBeTrue(errors, decision.backupRestoreEvidence, 'reviewed', 'backupRestoreEvidence');
    ['backupIdentifier', 'backupTimestamp', 'restoreProcedureLocation'].forEach(function(field) {
      if (typeof decision.backupRestoreEvidence[field] !== 'string' || decision.backupRestoreEvidence[field].trim() === '') {
        errors.push('backupRestoreEvidence.' + field + ' must be a non-empty string');
      }
    });
  }

  if (decision && decision.rollbackEvidence) {
    mustBeTrue(errors, decision.rollbackEvidence, 'activationGateDisablement', 'rollbackEvidence');
    mustBeTrue(errors, decision.rollbackEvidence, 'sharedOrEdgeLimiterFallback', 'rollbackEvidence');
    mustBeTrue(errors, decision.rollbackEvidence, 'noDropAfterProductionWrites', 'rollbackEvidence');
    mustBeTrue(errors, decision.rollbackEvidence, 'dataPreservingRollbackReviewed', 'rollbackEvidence');
  }

  (contract.requiredAcknowledgements || []).forEach(function(acknowledgement) {
    if (!decision || !Array.isArray(decision.acknowledgements) || decision.acknowledgements.indexOf(acknowledgement) === -1) {
      errors.push('decision missing acknowledgement: ' + acknowledgement);
    }
  });

  forbidden = collectForbiddenFields(decision, contract.forbiddenFields || [], '', []);
  forbidden.forEach(function(fieldPath) {
    errors.push('decision contains forbidden field ' + fieldPath);
  });

  return {
    schemaVersion: 1,
    scope: contract.scope,
    activationAllowed: errors.length === 0 && decision && decision.decisionStatus === 'approved-for-activation',
    status: errors.length === 0 ? 'complete' : 'blocked',
    blockedReasons: errors
  };
}

function run(args) {
  var decisionPath = readArg(args, 'decision', null);
  var contractPath = readArg(args, 'contract', 'data/mappings/anonymous-runtime-production-decision-contract.json');
  var outPath = readArg(args, 'out', null);
  var result;

  if (!decisionPath) {
    console.error('Missing required --decision=<path> argument');
    return 1;
  }

  try {
    result = validateDecision(readJsonFile(decisionPath), readJsonFile(contractPath));
  } catch (error) {
    console.error('Failed to validate anonymous runtime decision: ' + error.message);
    return 1;
  }

  try {
    if (outPath) {
      writeJsonFile(outPath, result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write anonymous runtime decision validation: ' + error.message);
    return 1;
  }

  if (result.status !== 'complete') {
    console.error('Anonymous runtime decision validation failed: ' + result.blockedReasons.join('; '));
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  validateDecision: validateDecision,
  run: run
};
