'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var appDockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
var postgresDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.postgres-test'), 'utf8');
var apiDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.modern-api'), 'utf8');
var dbTestDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.modern-db-test'), 'utf8');
var proxyTestDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.proxy-test'), 'utf8');
var browserTestDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.start-local-browser-test'), 'utf8');
var testCompose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
var compose = fs.readFileSync(path.join(root, 'docker-compose.integrated.yml'), 'utf8');
var publicCompose = fs.readFileSync(path.join(root, 'docker-compose.public-api.yml'), 'utf8');
var dependabot = fs.readFileSync(path.join(root, '.github', 'dependabot.yml'), 'utf8');
var refreshDoc = fs.readFileSync(path.join(root, 'docs', 'container-base-refresh.md'), 'utf8');
var nodeImage = 'node:26-bookworm-slim@sha256:4db36457f406501e6f608802e5da617e5fbd0e80b75901b6a09de1ae5a667d32';

[appDockerfile, apiDockerfile, dbTestDockerfile, proxyTestDockerfile, browserTestDockerfile]
  .forEach(function (dockerfile) {
    var stages = dockerfile.match(/^FROM node:[^\s]+/gm) || [];
    assert(stages.length > 0);
    stages.forEach(function (stage) {
      assert.strictEqual(stage, 'FROM ' + nodeImage);
    });
  });
assert.strictEqual((apiDockerfile.match(/^FROM node:/gm) || []).length, 2);

assert(appDockerfile.indexOf('ENV NODE_ENV=production') !== -1);
assert(appDockerfile.indexOf('USER node') !== -1);
assert(appDockerfile.indexOf('USER node') < appDockerfile.indexOf('CMD ['));
assert(apiDockerfile.indexOf('scripts/verify_deployment_config.js') !== -1);
assert(apiDockerfile.indexOf('--service=api') !== -1);
assert(apiDockerfile.indexOf('ci --ignore-scripts') !== -1);
assert(apiDockerfile.indexOf('ci --omit=dev --ignore-scripts') !== -1);
assert(apiDockerfile.indexOf('COPY data ./data/') !== -1);
assert(apiDockerfile.indexOf('USER node') !== -1);
assert(apiDockerfile.indexOf('USER node') < apiDockerfile.indexOf('CMD ['));
assert(postgresDockerfile.indexOf('002_unis_partial_seed.sql') !== -1);
assert(browserTestDockerfile.indexOf('RUN npm ci') !== -1);
assert(browserTestDockerfile.indexOf('RUN npx playwright install --with-deps') !== -1);
assert(browserTestDockerfile.indexOf('playwright@') === -1);
assert(dbTestDockerfile.indexOf('COPY data ./data/') !== -1);
assert(proxyTestDockerfile.indexOf('COPY data ./data/') !== -1);
assert(browserTestDockerfile.indexOf('COPY data ./data/') !== -1);
assert(testCompose.indexOf('127.0.0.1::5432') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=app') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=api') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_BIND') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_HOST_PORT') !== -1);
assert(dependabot.indexOf('package-ecosystem: docker') !== -1);
assert(dependabot.indexOf('interval: weekly') !== -1);
assert(dependabot.indexOf('open-pull-requests-limit: 1') !== -1);
assert(refreshDoc.indexOf('## Security Advisory Response') !== -1);
assert(refreshDoc.indexOf('## Rollback') !== -1);
