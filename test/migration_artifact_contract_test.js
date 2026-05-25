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
var anonymousSessionProfileTables = migrations.filter(function(migration) {
  return migration.fileName === '202605241100_reserve_anonymous_session_profile_tables.md';
})[0].body;
var anonymousRateLimitBuckets = migrations.filter(function(migration) {
  return migration.fileName === '202605241200_add_anonymous_rate_limit_buckets.md';
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

assert(docs.indexOf('202605241100_reserve_anonymous_session_profile_tables.md') !== -1);
assert(anonymousSessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS anonymous_sessions') !== -1);
assert(anonymousSessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS anonymous_planning_profiles') !== -1);
assert(anonymousSessionProfileTables.indexOf('CREATE TABLE IF NOT EXISTS anonymous_profile_events') !== -1);
assert(anonymousSessionProfileTables.indexOf('token_hash bytea NOT NULL') !== -1);
assert(anonymousSessionProfileTables.indexOf('csrf_token_hash bytea NOT NULL') !== -1);
assert(anonymousSessionProfileTables.indexOf('public_id varchar(64) NOT NULL') !== -1);
assert(anonymousSessionProfileTables.indexOf('expires_at timestamptz NOT NULL') !== -1);
assert(anonymousSessionProfileTables.indexOf('revoked_at timestamptz') !== -1);
assert(anonymousSessionProfileTables.indexOf('revoke_reason varchar(64)') !== -1);
assert(anonymousSessionProfileTables.indexOf('CHECK (expires_at > created_at)') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_session_id bigint NOT NULL REFERENCES anonymous_sessions(id)') !== -1);
assert(anonymousSessionProfileTables.indexOf('export_requested_at timestamptz') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_sessions_public_id_unique') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_sessions_token_hash_unique') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_sessions_active_expiry_index') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_planning_profiles_session_active_unique') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_planning_profiles_retention_index') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_profile_events_session_created_index') !== -1);
assert(anonymousSessionProfileTables.indexOf('anonymous_profile_events_profile_created_index') !== -1);
assert(anonymousSessionProfileTables.indexOf('Do not backfill them from `demo_sessions`, `user_accounts`, or source-backed planning tables.') !== -1);
assert(anonymousSessionProfileTables.indexOf('Anonymous session/profile endpoints enabled: no') !== -1);
assert(anonymousSessionProfileTables.indexOf('Expected API readiness remains versioned as `baseline-read-v1`') !== -1);
assert(anonymousSessionProfileTables.indexOf('Pre-Activation Rollback') !== -1);
assert(anonymousSessionProfileTables.indexOf('Post-Activation Rollback') !== -1);
assert(anonymousSessionProfileTables.indexOf('All counts must be zero') !== -1);
assert(anonymousSessionProfileTables.indexOf('Backup restore can roll back unrelated production data') !== -1);
assert(anonymousSessionProfileTables.indexOf('do not drop them directly') !== -1);
assert(anonymousSessionProfileTables.indexOf('DROP TABLE IF EXISTS anonymous_profile_events') < anonymousSessionProfileTables.indexOf('DROP TABLE IF EXISTS anonymous_planning_profiles'));
assert(anonymousSessionProfileTables.indexOf('DROP TABLE IF EXISTS anonymous_planning_profiles') < anonymousSessionProfileTables.indexOf('DROP TABLE IF EXISTS anonymous_sessions'));

assert(docs.indexOf('202605241200_add_anonymous_rate_limit_buckets.md') !== -1);
assert(anonymousRateLimitBuckets.indexOf('CREATE TABLE IF NOT EXISTS anonymous_rate_limit_buckets') !== -1);
assert(anonymousRateLimitBuckets.indexOf('rate_limit_key text PRIMARY KEY') !== -1);
assert(anonymousRateLimitBuckets.indexOf('request_count integer NOT NULL DEFAULT 0') !== -1);
assert(anonymousRateLimitBuckets.indexOf('reset_at timestamptz NOT NULL') !== -1);
assert(anonymousRateLimitBuckets.indexOf('anonymous_rate_limit_buckets_reset_index') !== -1);
assert(anonymousRateLimitBuckets.indexOf('Do not seed this table. It is runtime-owned counter state.') !== -1);
assert(anonymousRateLimitBuckets.indexOf('Only drop `anonymous_rate_limit_buckets` after anonymous shared-limiter traffic is disabled or routed away.') !== -1);
assert(anonymousRateLimitBuckets.indexOf('Verify no API instance is running with `UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE=shared`.') !== -1);
assert(anonymousRateLimitBuckets.indexOf('accepting the rate-limit reset and observability loss') !== -1);
assert(anonymousRateLimitBuckets.indexOf('`429` responses include `Retry-After`') !== -1);
assert(anonymousRateLimitBuckets.indexOf('DROP TABLE IF EXISTS anonymous_rate_limit_buckets') !== -1);

assert(docs.indexOf('Anonymous Runtime Migrations') !== -1);
assert(docs.indexOf('apply `202605241100_reserve_anonymous_session_profile_tables.md` before `202605241200_add_anonymous_rate_limit_buckets.md`') !== -1);
assert(docs.indexOf('Once anonymous production rows exist, preserve the anonymous tables') !== -1);
assert(docs.indexOf('anonymous schema readiness is a separate runtime activation gate') !== -1);
