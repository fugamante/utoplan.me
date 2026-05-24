'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var apiDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.modern-api'), 'utf8');
var anonymousPostgresDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.postgres-anonymous-test'), 'utf8');
var compose = fs.readFileSync(path.join(root, 'docker-compose.integrated.yml'), 'utf8');
var demoCompose = fs.readFileSync(path.join(root, 'docker-compose.demo.yml'), 'utf8');
var anonymousCompose = fs.readFileSync(path.join(root, 'docker-compose.anonymous.yml'), 'utf8');
var packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

assert(apiDockerfile.indexOf('scripts/verify_deployment_config.js') !== -1);
assert(apiDockerfile.indexOf('--service=api') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=app') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=api') !== -1);
assert(demoCompose.indexOf('Dockerfile.postgres-test') !== -1);
assert(demoCompose.indexOf('UTOPLAN_DEMO_SESSIONS: "1"') !== -1);
assert(demoCompose.indexOf('"8080:8080"') !== -1);
assert(demoCompose.indexOf('"15432:5432"') !== -1);
assert(anonymousPostgresDockerfile.indexOf('docker/postgres/init.sql') !== -1);
assert(anonymousPostgresDockerfile.indexOf('docker/postgres/anonymous.sql') !== -1);
assert(anonymousCompose.indexOf('Dockerfile.postgres-anonymous-test') !== -1);
assert(anonymousCompose.indexOf('UTOPLAN_ANONYMOUS_RUNTIME: "1"') !== -1);
assert(anonymousCompose.indexOf('UTOPLAN_ANONYMOUS_RATE_LIMIT_MODE: shared') !== -1);
assert(anonymousCompose.indexOf('UTOPLAN_ANONYMOUS_SHARED_RATE_LIMIT: "1"') !== -1);
assert(anonymousCompose.indexOf('UTOPLAN_TRUST_PROXY: "1"') !== -1);
assert(anonymousCompose.indexOf('http://127.0.0.1:18084') !== -1);
assert(anonymousCompose.indexOf('"18084:8080"') !== -1);
assert(anonymousCompose.indexOf('"13001:3001"') !== -1);
assert(packageJson.indexOf('docker:test:anonymous-runtime') !== -1);
assert(packageJson.indexOf('UTOPLAN_ANONYMOUS_SMOKE=1 npm run verify:release-smoke') !== -1);
