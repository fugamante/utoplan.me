'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var migrationsDir = path.join(root, 'db', 'migrations');
var readme = fs.readFileSync(path.join(migrationsDir, 'README.md'), 'utf8');
var template = fs.readFileSync(path.join(migrationsDir, 'TEMPLATE.md'), 'utf8');
var migrationFiles = fs.readdirSync(migrationsDir).filter(function(fileName) {
  return /^[0-9]{12}_.+\.md$/.test(fileName);
});
var migrations = migrationFiles.map(function(fileName) {
  return {
    fileName: fileName,
    body: fs.readFileSync(path.join(migrationsDir, fileName), 'utf8')
  };
});
var baseline = migrations.filter(function(migration) {
  return migration.fileName === '202605211200_baseline_read_v1.md';
})[0].body;
var naturalKeyIndexes = migrations.filter(function(migration) {
  return migration.fileName === '202605230900_add_load_natural_key_indexes.md';
})[0].body;
var sessionProfileTables = migrations.filter(function(migration) {
  return migration.fileName === '202605241000_reserve_session_profile_tables.md';
})[0].body;
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
  migrations.forEach(function(migration) {
    assert(migration.body.indexOf('## ' + heading) !== -1, heading + ' should be in ' + migration.fileName);
  });
});

assert(readme.indexOf('YYYYMMDDHHMM_short_action.md') !== -1);
assert(docs.indexOf('baseline-read-v1') !== -1);
assert(docs.indexOf('Never run schema mutation') !== -1);
assert(baseline.indexOf('schemaVersion') !== -1);
assert(baseline.indexOf('baseline-read-v1') !== -1);
assert(baseline.indexOf('No production apply step is required') !== -1);

assert(docs.indexOf('202605230900_add_load_natural_key_indexes.md') !== -1);
assert(naturalKeyIndexes.indexOf('CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS cbps_county_cnaic_unique') !== -1);
assert(naturalKeyIndexes.indexOf('CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS muns_county_unique') !== -1);
assert(naturalKeyIndexes.indexOf('CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unis_title_address_unique') !== -1);
assert(naturalKeyIndexes.indexOf('DROP INDEX CONCURRENTLY IF EXISTS cbps_county_cnaic_unique') !== -1);
assert(naturalKeyIndexes.indexOf('npm run docker:test:data-sql-preview') !== -1);
assert(naturalKeyIndexes.indexOf('All three duplicate checks must return zero rows') !== -1);
assert(naturalKeyIndexes.indexOf('All three incomplete-key checks should return zero before a writer is enabled') !== -1);

assert(docs.indexOf('202605241000_reserve_session_profile_tables.md') !== -1);
assert(sessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS user_accounts') !== -1);
assert(sessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS user_sessions') !== -1);
assert(sessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS planning_profiles') !== -1);
assert(sessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS profile_events') !== -1);
assert(sessionProfileTables.indexOf('token_hash bytea NOT NULL') !== -1);
assert(sessionProfileTables.indexOf('password_hash text NOT NULL') !== -1);
assert(sessionProfileTables.indexOf('planning_profiles_account_active_unique') !== -1);
assert(sessionProfileTables.indexOf('Do not seed these tables with real or sample user data in production.') !== -1);
assert(sessionProfileTables.indexOf('Production auth endpoints enabled: no') !== -1);
assert(sessionProfileTables.indexOf('Expected API readiness remains versioned as `baseline-read-v1`') !== -1);
assert(sessionProfileTables.indexOf('DROP TABLE IF EXISTS profile_events') !== -1);
