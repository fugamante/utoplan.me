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
var dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');
var testCompose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
var compose = fs.readFileSync(path.join(root, 'docker-compose.integrated.yml'), 'utf8');
var publicCompose = fs.readFileSync(path.join(root, 'docker-compose.public-api.yml'), 'utf8');
var dependabot = fs.readFileSync(path.join(root, '.github', 'dependabot.yml'), 'utf8');
var baseRefresh = fs.readFileSync(path.join(root, 'docs', 'container-base-refresh.md'), 'utf8');
var nodeImage = 'node:26-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341';
var postgresImage = 'postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777';

[
  appDockerfile,
  apiDockerfile,
  dbTestDockerfile,
  proxyTestDockerfile,
  browserTestDockerfile
].forEach(function (dockerfile) {
  var nodeStages = dockerfile.match(/^FROM node:[^\s]+/gm) || [];
  assert(nodeStages.length > 0);
  nodeStages.forEach(function (from) {
    assert.strictEqual(from, 'FROM ' + nodeImage);
  });
});
assert.strictEqual((apiDockerfile.match(/^FROM node:/gm) || []).length, 2);
assert.strictEqual(postgresDockerfile.split('\n')[0], 'FROM ' + postgresImage);
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
assert(dockerignore.indexOf('dtoapi/modern/node_modules') !== -1);
assert(testCompose.indexOf('127.0.0.1::5432') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=app') !== -1);
assert(compose.indexOf('node scripts/verify_deployment_config.js --service=api') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_BIND') !== -1);
assert(publicCompose.indexOf('UTOPLAN_API_HOST_PORT') !== -1);
assert(dependabot.indexOf('package-ecosystem: docker') !== -1);
assert.strictEqual((dependabot.match(/package-ecosystem: npm/g) || []).length, 3);
assert(dependabot.indexOf('directory: /app') !== -1);
assert(dependabot.indexOf('directory: /dtoapi/modern') !== -1);
assert.strictEqual((dependabot.match(/version-update:semver-major/g) || []).length, 3);
assert(dependabot.indexOf('interval: weekly') !== -1);
assert(dependabot.indexOf('timezone: America/Puerto_Rico') !== -1);
assert(dependabot.indexOf('open-pull-requests-limit: 1') !== -1);
assert(baseRefresh.indexOf('modernization maintainer owns review') !== -1);
assert(baseRefresh.indexOf('## Security Advisory Response') !== -1);
assert(baseRefresh.indexOf('## Rollback') !== -1);
