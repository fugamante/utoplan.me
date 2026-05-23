'use strict';

var fs = require('fs');
var path = require('path');
var loadPlanBuilder = require('./data_load_plan');
var previewer = require('./data_sql_preview');

function requirePg() {
  try {
    return require('pg');
  } catch (error) {
    return require(path.join(__dirname, '..', 'dtoapi', 'modern', 'node_modules', 'pg'));
  }
}

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

function connectionConfig(env) {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL
    };
  }

  return {
    host: env.TEST_DATABASE_HOST || env.DATABASE_HOST || '127.0.0.1',
    port: Number(env.TEST_DATABASE_PORT || env.DATABASE_PORT || 5432),
    user: env.TEST_DATABASE_USER || env.DATABASE_USER || 'postgres',
    password: env.TEST_DATABASE_PASSWORD || env.DATABASE_PASSWORD || '',
    database: env.TEST_DATABASE_DB || env.DATABASE_DB || 'dtoapi_test'
  };
}

function indexPolicyTables(policy) {
  return policy.idempotency.tables.reduce(function(index, tablePolicy) {
    index[tablePolicy.table] = tablePolicy;
    return index;
  }, {});
}

function countSql(table) {
  return 'SELECT COUNT(*)::int AS count FROM ' + previewer.quoteIdentifier(table);
}

function keyCountSql(table, naturalKey) {
  return countSql(table) + ' WHERE ' + naturalKey.map(function(column, index) {
    return previewer.quoteIdentifier(column) + ' = $' + (index + 1);
  }).join(' AND ');
}

function tableCounts(client, tables) {
  return tables.reduce(function(promise, table) {
    return promise.then(function(counts) {
      return client.query(countSql(table)).then(function(result) {
        counts[table] = result.rows[0].count;
        return counts;
      });
    });
  }, Promise.resolve({}));
}

function keyCount(client, statement, tablePolicy) {
  var values = tablePolicy.naturalKey.map(function(column) {
    var index = statement.columns.indexOf(column);

    if (index === -1) {
      throw new Error('Preview statement missing natural key ' + statement.table + '.' + column);
    }

    return statement.params[index];
  });

  return client.query(keyCountSql(statement.table, tablePolicy.naturalKey), values).then(function(result) {
    return result.rows[0].count;
  });
}

function buildPreview(options) {
  var planningReport = readJsonFile(options.planningReportPath);
  var policy = readJsonFile(options.policyPath);
  var loadPlan = loadPlanBuilder.buildLoadPlan(planningReport, {
    timestamp: options.timestamp
  });

  return {
    policy: policy,
    preview: previewer.buildSqlPreview(loadPlan, policy, {
      acknowledgeSkipped: true,
      timestamp: options.previewTimestamp
    })
  };
}

function validate(client, options) {
  var built = buildPreview(options);
  var policyTables = indexPolicyTables(built.policy);
  var preview = built.preview;
  var tables = Object.keys(preview.summary.rows).sort();
  var expectedDelta = {};
  var beforeCounts;

  if (!preview.dryRunOnly || preview.mutationAllowed) {
    throw new Error('SQL preview must remain dry-run only');
  }

  if (preview.blockedReasons.length) {
    throw new Error('SQL preview is blocked: ' + preview.blockedReasons.join('; '));
  }

  tables.forEach(function(table) {
    expectedDelta[table] = 0;
  });

  return tableCounts(client, tables)
    .then(function(counts) {
      beforeCounts = counts;
      return client.query('BEGIN');
    })
    .then(function() {
      return preview.statements.reduce(function(promise, statement) {
        var tablePolicy = policyTables[statement.table];

        return promise
          .then(function() {
            return keyCount(client, statement, tablePolicy);
          })
          .then(function(countBeforeKey) {
            if (countBeforeKey > 1) {
              throw new Error('Natural key is not unique for table ' + statement.table);
            }

            if (countBeforeKey === 0) {
              expectedDelta[statement.table] += 1;
            }

            return client.query(statement.sql, statement.params);
          })
          .then(function(result) {
            if (result.rowCount !== 1) {
              throw new Error('Expected one affected row for ' + statement.table);
            }

            return keyCount(client, statement, tablePolicy);
          })
          .then(function(countAfterKey) {
            if (countAfterKey !== 1) {
              throw new Error('Expected one row after upsert for ' + statement.table);
            }
          });
      }, Promise.resolve());
    })
    .then(function() {
      return tableCounts(client, tables);
    })
    .then(function(inTransactionCounts) {
      tables.forEach(function(table) {
        var expected = beforeCounts[table] + expectedDelta[table];

        if (inTransactionCounts[table] !== expected) {
          throw new Error('Unexpected in-transaction count for ' + table + ': expected ' + expected + ', got ' + inTransactionCounts[table]);
        }
      });

      return client.query('ROLLBACK');
    })
    .then(function() {
      return tableCounts(client, tables);
    })
    .then(function(afterCounts) {
      tables.forEach(function(table) {
        if (afterCounts[table] !== beforeCounts[table]) {
          throw new Error('Rollback did not restore count for ' + table);
        }
      });

      return {
        statements: preview.statements.length,
        tables: tables,
        beforeCounts: beforeCounts,
        expectedDelta: expectedDelta,
        afterRollbackCounts: afterCounts
      };
    })
    .catch(function(error) {
      return client.query('ROLLBACK').catch(function() {
        return null;
      }).then(function() {
        throw error;
      });
    });
}

function run(args) {
  var pg = requirePg();
  var client = new pg.Client(connectionConfig(process.env));
  var options = {
    planningReportPath: readArg(args, 'planning-report', path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'import-plan-report.json')),
    policyPath: readArg(args, 'policy', path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-load-policy.json')),
    timestamp: readArg(args, 'timestamp', '2026-05-22T12:00:00.000Z'),
    previewTimestamp: readArg(args, 'preview-timestamp', '2026-05-22T13:00:00.000Z')
  };

  return client.connect()
    .then(function() {
      return validate(client, options);
    })
    .then(function(result) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return 0;
    })
    .catch(function(error) {
      console.error(error.stack || error.message);
      return 1;
    })
    .then(function(status) {
      return client.end().then(function() {
        return status;
      });
    });
}

if (require.main === module) {
  run(process.argv.slice(2)).then(function(status) {
    process.exit(status);
  });
}

module.exports = {
  connectionConfig: connectionConfig,
  validate: validate
};
