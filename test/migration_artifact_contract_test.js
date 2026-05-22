'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var migrationsDir = path.join(root, 'db', 'migrations');
var readme = fs.readFileSync(path.join(migrationsDir, 'README.md'), 'utf8');
var template = fs.readFileSync(path.join(migrationsDir, 'TEMPLATE.md'), 'utf8');
var baseline = fs.readFileSync(path.join(migrationsDir, '202605211200_baseline_read_v1.md'), 'utf8');
var docs = fs.readFileSync(path.join(root, 'docs', 'database-migrations.md'), 'utf8');

[
  'Summary',
  'Compatibility',
  'Preflight',
  'Apply',
  'Verify',
  'Rollback',
  'Post-Deploy'
].forEach(function(heading) {
  assert(readme.indexOf('`' + heading + '`') !== -1, heading + ' should be required');
  assert(template.indexOf('## ' + heading) !== -1, heading + ' should be in the template');
  assert(baseline.indexOf('## ' + heading) !== -1, heading + ' should be in the baseline artifact');
});

assert(readme.indexOf('YYYYMMDDHHMM_short_action.md') !== -1);
assert(docs.indexOf('baseline-read-v1') !== -1);
assert(docs.indexOf('Never run schema mutation') !== -1);
assert(baseline.indexOf('schemaVersion') !== -1);
assert(baseline.indexOf('baseline-read-v1') !== -1);
assert(baseline.indexOf('No production apply step is required') !== -1);
