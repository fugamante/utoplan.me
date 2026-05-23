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

function withTimestamps(record, timestamp) {
  return Object.assign({}, record, {
    created_at: timestamp,
    updated_at: timestamp
  });
}

function emptyLoadPlan(timestamp) {
  return {
    generatedAt: timestamp,
    rows: {
      cbps: [],
      muns: [],
      unis: []
    },
    skipped: {
      rejected: [],
      manualReview: [],
      unsupportedCacheSources: []
    },
    summary: {
      rows: {
        cbps: 0,
        muns: 0,
        unis: 0
      },
      skipped: {
        rejected: 0,
        manualReview: 0,
        unsupportedCacheSources: 0
      }
    }
  };
}

function buildLoadPlan(planningReport, options) {
  var timestamp = options && options.timestamp ? options.timestamp : new Date().toISOString();
  var loadPlan = emptyLoadPlan(timestamp);

  (planningReport.accepted || []).forEach(function(item) {
    if (!loadPlan.rows[item.table]) {
      return;
    }

    loadPlan.rows[item.table].push({
      sourceId: item.sourceId,
      rowIndex: item.rowIndex,
      record: withTimestamps(item.record, timestamp)
    });
  });

  loadPlan.skipped.rejected = (planningReport.rejected || []).slice();
  loadPlan.skipped.manualReview = (planningReport.manualReview || []).slice();
  loadPlan.skipped.unsupportedCacheSources = (planningReport.unsupportedCacheSources || []).slice();

  Object.keys(loadPlan.rows).forEach(function(table) {
    loadPlan.summary.rows[table] = loadPlan.rows[table].length;
  });

  loadPlan.summary.skipped.rejected = loadPlan.skipped.rejected.length;
  loadPlan.summary.skipped.manualReview = loadPlan.skipped.manualReview.length;
  loadPlan.summary.skipped.unsupportedCacheSources = loadPlan.skipped.unsupportedCacheSources.length;

  return loadPlan;
}

function run(args) {
  var planPath = readArg(args, 'plan', null);
  var outPath = readArg(args, 'out', null);
  var timestamp = readArg(args, 'timestamp', null);
  var planningReport;
  var loadPlan;

  if (!planPath) {
    console.error('Missing required --plan=<path> argument');
    return 1;
  }

  try {
    planningReport = readJsonFile(planPath);
  } catch (error) {
    console.error('Failed to read planning report: ' + error.message);
    return 1;
  }

  loadPlan = buildLoadPlan(planningReport, {
    timestamp: timestamp
  });

  try {
    if (outPath) {
      writeJsonFile(outPath, loadPlan);
    } else {
      process.stdout.write(JSON.stringify(loadPlan, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write load plan: ' + error.message);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  buildLoadPlan: buildLoadPlan,
  run: run
};
