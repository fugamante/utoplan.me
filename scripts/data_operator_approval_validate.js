'use strict';

var assert = require('assert');
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

function pushMissing(errors, value, field) {
  if (!Object.prototype.hasOwnProperty.call(value, field)) {
    errors.push('approval missing required field ' + field);
  }
}

function validateApproval(approval, preview, gate, contract) {
  var errors = [];
  var forbidden;
  var minReasonLength;

  (contract.requiredFields || []).forEach(function(field) {
    pushMissing(errors, approval || {}, field);
  });

  if (!approval || approval.schemaVersion !== contract.fieldRules.schemaVersion.equals) {
    errors.push('approval schemaVersion must be ' + contract.fieldRules.schemaVersion.equals);
  }

  if (!approval || approval.scope !== contract.fieldRules.scope.equals) {
    errors.push('approval scope must be ' + contract.fieldRules.scope.equals);
  }

  if (!approval || typeof approval.approvedBy !== 'string' || approval.approvedBy.trim() === '') {
    errors.push('approval approvedBy must be a non-empty neutral operator label');
  } else if (approval.approvedBy.indexOf('@') !== -1) {
    errors.push('approval approvedBy must not contain personal email-style identifiers');
  }

  if (!approval || !isIsoTimestamp(approval.approvedAt)) {
    errors.push('approval approvedAt must be an ISO-8601 UTC timestamp');
  }

  minReasonLength = contract.fieldRules.approvalReason.minLength;
  if (!approval || typeof approval.approvalReason !== 'string' || approval.approvalReason.length < minReasonLength) {
    errors.push('approval approvalReason must be at least ' + minReasonLength + ' characters');
  }

  if (!approval || approval.skippedAcknowledged !== true) {
    errors.push('approval skippedAcknowledged must be true');
  }

  try {
    assert.deepStrictEqual(approval ? approval.skippedSummary : null, preview.summary.skipped);
  } catch (error) {
    errors.push('approval skippedSummary must match sqlPreview.summary.skipped');
  }

  if (!approval || !approval.sourceArtifacts) {
    errors.push('approval sourceArtifacts are required');
  } else {
    if (approval.sourceArtifacts.loadPlanGeneratedAt !== preview.sourceLoadPlanGeneratedAt) {
      errors.push('approval sourceArtifacts.loadPlanGeneratedAt must match sqlPreview.sourceLoadPlanGeneratedAt');
    }
    if (approval.sourceArtifacts.sqlPreviewGeneratedAt !== preview.generatedAt) {
      errors.push('approval sourceArtifacts.sqlPreviewGeneratedAt must match sqlPreview.generatedAt');
    }
    if (approval.sourceArtifacts.writerGateSchemaVersion !== gate.schemaVersion) {
      errors.push('approval sourceArtifacts.writerGateSchemaVersion must match writerGate.schemaVersion');
    }
  }

  if (!gate || gate.writerEnabled !== false || gate.writerEnablementAllowed !== true) {
    errors.push('writer gate must allow enablement while keeping writerEnabled false');
  }

  (contract.requiredAcknowledgements || []).forEach(function(acknowledgement) {
    if (!approval || !Array.isArray(approval.acknowledgements) || approval.acknowledgements.indexOf(acknowledgement) === -1) {
      errors.push('approval missing acknowledgement: ' + acknowledgement);
    }
  });

  forbidden = collectForbiddenFields(approval, contract.forbiddenFields || [], '', []);
  forbidden.forEach(function(fieldPath) {
    errors.push('approval contains forbidden field ' + fieldPath);
  });

  return {
    schemaVersion: 1,
    approvalValid: errors.length === 0,
    mutationAllowed: false,
    errors: errors
  };
}

function run(args) {
  var approvalPath = readArg(args, 'approval', null);
  var previewPath = readArg(args, 'sql-preview', null);
  var gatePath = readArg(args, 'writer-gate', null);
  var contractPath = readArg(args, 'contract', 'data/mappings/puerto-rico-operator-approval-contract.json');
  var outPath = readArg(args, 'out', null);
  var result;

  if (!approvalPath) {
    console.error('Missing required --approval=<path> argument');
    return 1;
  }

  if (!previewPath) {
    console.error('Missing required --sql-preview=<path> argument');
    return 1;
  }

  if (!gatePath) {
    console.error('Missing required --writer-gate=<path> argument');
    return 1;
  }

  try {
    result = validateApproval(
      readJsonFile(approvalPath),
      readJsonFile(previewPath),
      readJsonFile(gatePath),
      readJsonFile(contractPath)
    );
  } catch (error) {
    console.error('Failed to validate operator approval: ' + error.message);
    return 1;
  }

  try {
    if (outPath) {
      writeJsonFile(outPath, result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write operator approval validation: ' + error.message);
    return 1;
  }

  if (!result.approvalValid) {
    console.error('Operator approval validation failed: ' + result.errors.join('; '));
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  validateApproval: validateApproval,
  run: run
};
