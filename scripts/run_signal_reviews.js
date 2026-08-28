'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var artifactPattern = /^data\/profile-reach\/aguada-restaurant-.*-review\.json$/;
var scriptPattern = /^test:.*-signal-review$/;
var commandPattern = /^node (test\/[^ ]+\.js)$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildPlan(options) {
  var base = options && options.root ? options.root : root;
  var packageContract = options && options.packageContract
    ? options.packageContract
    : readJson(path.join(base, 'package.json'));
  var registry = options && options.registry
    ? options.registry
    : readJson(path.join(base, 'data/profile-reach/decision-signal-registry-v1.json'));
  var artifactPaths = Array.from(new Set(registry.signals.reduce(function(paths, signal) {
    return paths.concat(signal.artifactPaths || []);
  }, []).filter(function(artifactPath) {
    return artifactPattern.test(artifactPath);
  }))).sort();

  if (artifactPaths.length === 0) {
    throw new Error('decision-signal registry exposes no reviewed signal artifacts');
  }

  artifactPaths.forEach(function(artifactPath) {
    var absolutePath = path.join(base, artifactPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error('reviewed artifact is missing: ' + artifactPath);
    }
    if (readJson(absolutePath).status !== 'reviewed') {
      throw new Error('registered signal artifact is not reviewed: ' + artifactPath);
    }
  });

  var focusedScripts = Object.keys(packageContract.scripts || {}).filter(function(scriptName) {
    return scriptPattern.test(scriptName);
  }).sort();
  var artifactToScript = {};

  focusedScripts.forEach(function(scriptName) {
    var command = packageContract.scripts[scriptName];
    var match = command.match(commandPattern);
    if (!match) {
      throw new Error(scriptName + ' must run one focused Node test file');
    }
    var testPath = match[1];
    var absoluteTestPath = path.join(base, testPath);
    if (!fs.existsSync(absoluteTestPath)) {
      throw new Error(scriptName + ' test file is missing: ' + testPath);
    }
    var contents = fs.readFileSync(absoluteTestPath, 'utf8');
    var referencedArtifacts = artifactPaths.filter(function(artifactPath) {
      return contents.indexOf(path.basename(artifactPath)) !== -1;
    });
    if (referencedArtifacts.length !== 1) {
      throw new Error(scriptName + ' must reference exactly one registered reviewed artifact');
    }
    var artifactPath = referencedArtifacts[0];
    if (artifactToScript[artifactPath]) {
      throw new Error('reviewed artifact has multiple focused tests: ' + artifactPath);
    }
    artifactToScript[artifactPath] = scriptName;
  });

  artifactPaths.forEach(function(artifactPath) {
    if (!artifactToScript[artifactPath]) {
      throw new Error('reviewed artifact has no focused test: ' + artifactPath);
    }
  });

  if (packageContract.scripts['test:decision-signals'] !== 'node test/decision_signal_registry_test.js') {
    throw new Error('test:decision-signals must retain its focused registry contract');
  }
  if (packageContract.scripts['test:signal-review-orchestration'] !== 'node test/signal_review_orchestration_test.js') {
    throw new Error('test:signal-review-orchestration must retain its contract test');
  }
  if (packageContract.scripts['test:signal-reviews'] !== 'node scripts/run_signal_reviews.js') {
    throw new Error('test:signal-reviews must retain the deterministic aggregate runner');
  }
  var rootTest = packageContract.scripts.test || '';
  if ((rootTest.match(/npm run test:signal-reviews/g) || []).length !== 1) {
    throw new Error('root test chain must invoke test:signal-reviews exactly once');
  }
  focusedScripts.concat(['test:decision-signals']).forEach(function(scriptName) {
    if (rootTest.indexOf('npm run ' + scriptName) !== -1) {
      throw new Error('root test chain must route ' + scriptName + ' through test:signal-reviews');
    }
  });

  return ['test:signal-review-orchestration', 'test:decision-signals'].concat(focusedScripts);
}

function run() {
  var npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  buildPlan().forEach(function(scriptName) {
    var result = childProcess.spawnSync(npmCommand, ['run', scriptName], {
      cwd: root,
      stdio: 'inherit'
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  });
}

if (require.main === module) {
  run();
}

module.exports = {
  buildPlan: buildPlan
};
