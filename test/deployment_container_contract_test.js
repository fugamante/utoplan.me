'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var apiDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.modern-api'), 'utf8');
var compose = fs.readFileSync(path.join(root, 'docker-compose.integrated.yml'), 'utf8');
var demoCompose = fs.readFileSync(path.join(root, 'docker-compose.demo.yml'), 'utf8');

assert(apiDockerfile.indexOf('scripts/verify_deployment_config.js') !== -1);
assert(apiDockerfile.indexOf('--service=api') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=app') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=api') !== -1);
assert(demoCompose.indexOf('Dockerfile.postgres-test') !== -1);
assert(demoCompose.indexOf('UTOPLAN_DEMO_SESSIONS: "1"') !== -1);
assert(demoCompose.indexOf('"8080:8080"') !== -1);
assert(demoCompose.indexOf('"15432:5432"') !== -1);
