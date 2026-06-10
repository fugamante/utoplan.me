'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var appDockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
var apiDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.modern-api'), 'utf8');
var browserTestDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.start-local-browser-test'), 'utf8');
var testCompose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
var compose = fs.readFileSync(path.join(root, 'docker-compose.integrated.yml'), 'utf8');
var publicCompose = fs.readFileSync(path.join(root, 'docker-compose.public-api.yml'), 'utf8');

assert(appDockerfile.indexOf('ENV NODE_ENV=production') !== -1);
assert(apiDockerfile.indexOf('scripts/verify_deployment_config.js') !== -1);
assert(apiDockerfile.indexOf('--service=api') !== -1);
assert(apiDockerfile.indexOf('ci --ignore-scripts') !== -1);
assert(apiDockerfile.indexOf('ci --omit=dev --ignore-scripts') !== -1);
assert(browserTestDockerfile.indexOf('RUN npm ci') !== -1);
assert(browserTestDockerfile.indexOf('RUN npx playwright install --with-deps') !== -1);
assert(browserTestDockerfile.indexOf('playwright@') === -1);
assert(testCompose.indexOf('127.0.0.1::5432') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=app') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=api') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_BIND') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_HOST_PORT') !== -1);
