'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var runtime = require('../scripts/verify_node_runtime');

var rootDir = path.join(__dirname, '..');
var packageJson = require('../package.json');

assert.strictEqual(runtime.parseMajor('24'), 24);
assert.strictEqual(runtime.parseMajor('v24.3.1'), 24);
assert.strictEqual(runtime.parseMajor('invalid'), null);
assert.strictEqual(runtime.readPinnedMajor(rootDir), 24);
assert.strictEqual(runtime.validateVersion('v24.18.0', 24), null);
assert(runtime.validateVersion('v26.0.0', 24).indexOf('Node 24.x is required') !== -1);
assert.strictEqual(runtime.run({
  rootDir: rootDir,
  currentVersion: 'v24.9.0'
}), 0);

var originalError = console.error;

try {
  console.error = function() {};
  assert.strictEqual(runtime.run({
    rootDir: rootDir,
    currentVersion: 'v22.0.0'
  }), 1);
} finally {
  console.error = originalError;
}

['install:all', 'build', 'test'].forEach(function(scriptName) {
  assert(
    packageJson.scripts[scriptName].indexOf('npm run verify:node &&') === 0,
    scriptName + ' must explicitly verify the active Node runtime'
  );
});

var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-node-runtime-'));
var nodeShim = path.join(tempDir, 'node');
var substantiveMarker = path.join(tempDir, 'substantive-validation-started');
var npmCli = process.env.npm_execpath || childProcess.execFileSync(
  'sh',
  ['-c', 'command -v npm'],
  { encoding: 'utf8' }
).trim();

try {
  fs.writeFileSync(nodeShim, [
    '#!' + process.execPath,
    "'use strict';",
    "var childProcess = require('child_process');",
    "var fs = require('fs');",
    "var path = require('path');",
    "var verifier = path.join(" + JSON.stringify(rootDir) + ", 'scripts', 'verify_node_runtime.js');",
    "var target = path.resolve(process.argv[2] || '');",
    "if (target === verifier) {",
    "  var runtime = require(verifier);",
    "  process.exit(runtime.run({ currentVersion: 'v26.0.0' }));",
    "}",
    "if (path.basename(target) === 'npm' || path.basename(target) === 'npm-cli.js') {",
    "  var npmResult = childProcess.spawnSync(process.execPath, process.argv.slice(2), {",
    "    env: process.env,",
    "    stdio: 'inherit'",
    "  });",
    "  process.exit(npmResult.status === null ? 98 : npmResult.status);",
    "}",
    "fs.writeFileSync(" + JSON.stringify(substantiveMarker) + ", 'started');",
    "process.exit(97);",
    ''
  ].join('\n'), { mode: 0o700 });

  ['install:all', 'build', 'test'].forEach(function(scriptName) {
    var entrypoint = childProcess.spawnSync(
      process.execPath,
      [npmCli, 'run', scriptName, '--ignore-scripts'],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: Object.assign({}, process.env, {
          PATH: tempDir + path.delimiter + process.env.PATH,
          npm_config_ignore_scripts: 'true'
        })
      }
    );
    var entrypointOutput = entrypoint.stdout + entrypoint.stderr;

    assert.notStrictEqual(entrypoint.status, 0, scriptName + ' must reject Node 26');
    assert(
      entrypointOutput.indexOf('Node 24.x is required') !== -1,
      scriptName + ' must fail through the active runtime verifier'
    );
    assert.strictEqual(
      fs.existsSync(substantiveMarker),
      false,
      scriptName + ' must fail before substantive validation'
    );
  });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
