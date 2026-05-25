'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var cache = require('./data_source_cache');
var planner = require('./data_import_plan');

var DEFAULT_REGISTRY = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var DEFAULT_SOURCE_IDS = [
  'datospr-cbp-2014-municipios',
  'datospr-official-municipality-boundaries',
  'datospr-higher-ed-directory-2017-18',
  'nces-edge-postsecondary-locations-2021-pr'
];

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

function sourceIdsFromArgs(args) {
  var raw = readArg(args, 'sources', null);

  if (!raw) {
    return DEFAULT_SOURCE_IDS.slice();
  }

  return raw.split(',').map(function(value) {
    return value.trim();
  }).filter(Boolean);
}

function selectSources(registry, sourceIds) {
  var byId = registry.sources.reduce(function(map, source) {
    map[source.id] = source;
    return map;
  }, {});

  return sourceIds.map(function(sourceId) {
    if (!byId[sourceId]) {
      throw new Error('Unknown source id ' + sourceId);
    }
    return byId[sourceId];
  });
}

function buildAssertions(plan, sourceIds) {
  var assertions = [];

  if (sourceIds.indexOf('datospr-cbp-2014-municipios') !== -1) {
    assertions.push({
      name: 'cbps accepted rows',
      ok: plan.tables.cbps && plan.tables.cbps.accepted > 0,
      detail: plan.tables.cbps || null
    });
  }

  if (sourceIds.indexOf('datospr-official-municipality-boundaries') !== -1) {
    assertions.push({
      name: 'muns accepted rows',
      ok: plan.tables.muns && plan.tables.muns.accepted >= 78,
      detail: plan.tables.muns || null
    });
  }

  if (sourceIds.indexOf('datospr-higher-ed-directory-2017-18') !== -1 &&
      sourceIds.indexOf('nces-edge-postsecondary-locations-2021-pr') !== -1) {
    assertions.push({
      name: 'unis planned or reviewed rows',
      ok: plan.tables.unis && (plan.tables.unis.accepted + plan.tables.unis.manualReview) > 0,
      detail: plan.tables.unis || null
    });
  }

  assertions.push({
    name: 'no unsupported cached sources',
    ok: !plan.unsupportedCacheSources || plan.unsupportedCacheSources.length === 0,
    detail: plan.unsupportedCacheSources || []
  });

  return assertions;
}

function buildResult(options) {
  var plan = planner.planFixtureRows(planner.readCacheFixtures(options.cacheDir));
  var sourceIds = options.sourceIds.slice();
  var assertions = buildAssertions(plan, sourceIds);
  var failed = assertions.filter(function(assertion) {
    return !assertion.ok;
  });

  return {
    schemaVersion: 1,
    scope: 'puerto-rico-source-smoke',
    generatedAt: options.now || new Date().toISOString(),
    networkRequired: true,
    sourceIds: sourceIds,
    cacheDir: options.cacheDir,
    plan: {
      tables: plan.tables,
      unsupportedCacheSources: plan.unsupportedCacheSources || [],
      unsupportedCacheSourceErrors: plan.unsupportedCacheSourceErrors || []
    },
    assertions: assertions,
    status: failed.length === 0 ? 'pass' : 'fail'
  };
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function runSmoke(options) {
  var registry = options.registry || cache.readRegistry(options.registryPath || DEFAULT_REGISTRY);
  var sourceIds = options.sourceIds || DEFAULT_SOURCE_IDS.slice();
  var sources = selectSources(registry, sourceIds);
  var cacheDir = options.cacheDir || fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-source-smoke-'));
  var now = options.now || new Date().toISOString();
  var fetch = options.fetch;

  return sources.reduce(function(chain, source) {
    return chain.then(function() {
      return cache.cacheSource(source, {
        cacheDir: cacheDir,
        now: now,
        fetch: fetch
      });
    });
  }, Promise.resolve()).then(function() {
    return buildResult({
      cacheDir: cacheDir,
      sourceIds: sourceIds,
      now: now
    });
  });
}

function run(args) {
  var enabled = process.env.UTOPLAN_SOURCE_SMOKE === '1' || hasFlag(args, 'run');
  var registryPath = readArg(args, 'registry', DEFAULT_REGISTRY);
  var cacheDir = readArg(args, 'cache-dir', null);
  var outPath = readArg(args, 'out', null);
  var sourceIds = sourceIdsFromArgs(args);

  if (!enabled) {
    var skipped = {
      schemaVersion: 1,
      scope: 'puerto-rico-source-smoke',
      status: 'skipped',
      reason: 'Set UTOPLAN_SOURCE_SMOKE=1 or pass --run to perform networked source checks.',
      sourceIds: sourceIds
    };

    if (outPath) {
      writeJsonFile(outPath, skipped);
    } else {
      process.stdout.write(JSON.stringify(skipped, null, 2) + '\n');
    }
    return Promise.resolve(0);
  }

  return runSmoke({
    registryPath: registryPath,
    cacheDir: cacheDir,
    sourceIds: sourceIds
  }).then(function(result) {
    if (outPath) {
      writeJsonFile(outPath, result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }

    if (result.status !== 'pass') {
      console.error('Source smoke failed');
      return 1;
    }
    return 0;
  }).catch(function(error) {
    console.error('Source smoke failed: ' + error.message);
    return 1;
  });
}

if (require.main === module) {
  run(process.argv.slice(2)).then(function(status) {
    process.exit(status);
  });
}

module.exports = {
  DEFAULT_SOURCE_IDS: DEFAULT_SOURCE_IDS,
  buildAssertions: buildAssertions,
  buildResult: buildResult,
  run: run,
  runSmoke: runSmoke,
  selectSources: selectSources,
  sourceIdsFromArgs: sourceIdsFromArgs
};
