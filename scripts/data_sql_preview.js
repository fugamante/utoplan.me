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

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function hasFlag(args, name) {
  return args.indexOf('--' + name) !== -1;
}

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error('Unsafe SQL identifier: ' + identifier);
  }

  return '"' + identifier + '"';
}

function indexPolicyTables(policy) {
  var tables = {};

  (((policy || {}).idempotency || {}).tables || []).forEach(function(tablePolicy) {
    tables[tablePolicy.table] = tablePolicy;
  });

  return tables;
}

function skippedCount(loadPlan) {
  var skipped = loadPlan.skipped || {};

  return (skipped.rejected || []).length +
    (skipped.manualReview || []).length +
    (skipped.unsupportedCacheSources || []).length;
}

function requireColumns(record, table, columns) {
  columns.forEach(function(column) {
    if (!Object.prototype.hasOwnProperty.call(record, column)) {
      throw new Error('Missing required column ' + table + '.' + column);
    }
  });
}

function buildUpsertStatement(table, record, tablePolicy) {
  var columns = Object.keys(record);
  var values = columns.map(function(column) {
    return record[column];
  });
  var placeholders = columns.map(function(column, index) {
    return '$' + (index + 1);
  });
  var naturalKey = tablePolicy.naturalKey || [];
  var updateColumns = tablePolicy.updateColumns || [];
  var sql;

  if (!naturalKey.length) {
    throw new Error('Missing natural key policy for ' + table);
  }

  if (!updateColumns.length) {
    throw new Error('Missing update column policy for ' + table);
  }

  requireColumns(record, table, naturalKey);
  requireColumns(record, table, updateColumns);

  sql = 'INSERT INTO ' + quoteIdentifier(table) +
    ' (' + columns.map(quoteIdentifier).join(', ') + ')' +
    ' VALUES (' + placeholders.join(', ') + ')' +
    ' ON CONFLICT (' + naturalKey.map(quoteIdentifier).join(', ') + ')' +
    ' DO UPDATE SET ' + updateColumns.map(function(column) {
      return quoteIdentifier(column) + ' = EXCLUDED.' + quoteIdentifier(column);
    }).join(', ') +
    ';';

  return {
    table: table,
    sourceId: record.sourceId,
    columns: columns,
    sql: sql,
    params: values
  };
}

function buildSqlPreview(loadPlan, policy, options) {
  var policyTables = indexPolicyTables(policy);
  var rows = (loadPlan || {}).rows || {};
  var acknowledgeSkipped = options && options.acknowledgeSkipped;
  var preview = {
    schemaVersion: 1,
    generatedAt: options && options.timestamp ? options.timestamp : new Date().toISOString(),
    dryRunOnly: true,
    mutationAllowed: false,
    sourceLoadPlanGeneratedAt: loadPlan.generatedAt || null,
    policyScope: policy.scope || null,
    writerStatus: policy.writerStatus || null,
    requiresOperatorApproval: !!policy.requiresOperatorApproval,
    skippedAcknowledged: !!acknowledgeSkipped,
    transaction: {
      mode: policy.transaction ? policy.transaction.mode : null,
      begin: 'BEGIN;',
      commit: 'COMMIT;',
      rollbackOnFailure: true
    },
    statements: [],
    blockedReasons: [],
    summary: {
      rows: {},
      skipped: loadPlan.summary ? loadPlan.summary.skipped : {}
    }
  };

  if (policy.writerStatus !== 'not-implemented') {
    preview.blockedReasons.push('policy writerStatus must remain not-implemented for dry-run preview generation');
  }

  if (policy.transaction && policy.transaction.mode !== 'single-transaction') {
    preview.blockedReasons.push('policy transaction mode must be single-transaction');
  }

  if (policy.requiresOperatorApproval && skippedCount(loadPlan) > 0 && !acknowledgeSkipped) {
    preview.blockedReasons.push('skipped records require explicit operator acknowledgement before write execution');
  }

  Object.keys(rows).forEach(function(table) {
    var tableRows = rows[table] || [];
    var tablePolicy = policyTables[table];

    preview.summary.rows[table] = tableRows.length;

    if (!tablePolicy) {
      throw new Error('Missing idempotency policy for table ' + table);
    }

    tableRows.forEach(function(row) {
      var statement = buildUpsertStatement(table, row.record || {}, tablePolicy);

      statement.sourceId = row.sourceId || null;
      statement.rowIndex = Object.prototype.hasOwnProperty.call(row, 'rowIndex') ? row.rowIndex : null;
      preview.statements.push(statement);
    });
  });

  preview.summary.statementCount = preview.statements.length;

  return preview;
}

function run(args) {
  var loadPlanPath = readArg(args, 'load-plan', null);
  var policyPath = readArg(args, 'policy', 'data/mappings/puerto-rico-load-policy.json');
  var outPath = readArg(args, 'out', null);
  var timestamp = readArg(args, 'timestamp', null);
  var loadPlan;
  var policy;
  var preview;

  if (!loadPlanPath) {
    console.error('Missing required --load-plan=<path> argument');
    return 1;
  }

  try {
    loadPlan = readJsonFile(loadPlanPath);
    policy = readJsonFile(policyPath);
    preview = buildSqlPreview(loadPlan, policy, {
      acknowledgeSkipped: hasFlag(args, 'acknowledge-skipped'),
      timestamp: timestamp
    });
  } catch (error) {
    console.error('Failed to build SQL preview: ' + error.message);
    return 1;
  }

  try {
    if (outPath) {
      writeJsonFile(outPath, preview);
    } else {
      process.stdout.write(JSON.stringify(preview, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write SQL preview: ' + error.message);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  buildSqlPreview: buildSqlPreview,
  quoteIdentifier: quoteIdentifier,
  run: run
};
