var assert = require('assert');
var childProcess = require('child_process');

function run(env) {
  return childProcess.spawnSync(process.execPath, ['app.js'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, env),
    encoding: 'utf8',
    timeout: 5000
  });
}

var invalidOrigin = run({
  PORT: '18088',
  UTOPLAN_API_ORIGIN: 'ftp://127.0.0.1:3001'
});

assert.notStrictEqual(invalidOrigin.status, 0);
assert(invalidOrigin.stderr.indexOf('UTOPLAN_API_ORIGIN must use http or https') !== -1);

var conflictingModes = run({
  PORT: '18089',
  UTOPLAN_API_ORIGIN: 'http://127.0.0.1:3001',
  UTOPLAN_DEMO_FIXTURE: '1'
});

assert.notStrictEqual(conflictingModes.status, 0);
assert(conflictingModes.stderr.indexOf('cannot be enabled together') !== -1);
