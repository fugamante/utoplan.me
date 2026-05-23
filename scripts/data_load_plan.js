'use strict';

var fs = require('fs');
var path = require('path');

var DEFAULT_CONFIDENCE_PATH = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-provenance-confidence.json');

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

function readConfidenceContract(filePath) {
  return readJsonFile(filePath || DEFAULT_CONFIDENCE_PATH);
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
    provenanceContract: 'data/mappings/puerto-rico-provenance-confidence.json',
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

function assessmentIndex(confidenceContract) {
  return ((confidenceContract || {}).tableAssessments || []).reduce(function(index, assessment) {
    index[assessment.table] = assessment;
    return index;
  }, {});
}

function rowProvenance(item, confidenceContract) {
  var assessment = assessmentIndex(confidenceContract)[item.table];

  if (!assessment) {
    return {
      sourceId: item.sourceId,
      rowIndex: item.rowIndex,
      sourceConfidence: 'blocked',
      transformConfidence: 'blocked',
      productionReadiness: 'blocked',
      sourceBacked: false,
      notes: 'No provenance confidence assessment exists for this table.'
    };
  }

  return {
    sourceId: item.sourceId,
    rowIndex: item.rowIndex,
    sourceConfidence: assessment.sourceConfidence,
    transformConfidence: assessment.transformConfidence,
    productionReadiness: assessment.productionReadiness,
    sourceBacked: !!assessment.sourceBacked,
    notes: assessment.notes
  };
}

function buildLoadPlan(planningReport, options) {
  var timestamp = options && options.timestamp ? options.timestamp : new Date().toISOString();
  var confidenceContract = options && options.provenanceContract ? options.provenanceContract : readConfidenceContract();
  var loadPlan = emptyLoadPlan(timestamp);

  (planningReport.accepted || []).forEach(function(item) {
    if (!loadPlan.rows[item.table]) {
      return;
    }

    loadPlan.rows[item.table].push({
      sourceId: item.sourceId,
      rowIndex: item.rowIndex,
      provenance: rowProvenance(item, confidenceContract),
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
  readConfidenceContract: readConfidenceContract,
  rowProvenance: rowProvenance,
  run: run
};
