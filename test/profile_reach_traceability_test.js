'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

var profile = readJson('data/profile-reach/business-profile-reach-v1.json');
var registry = readJson('data/profile-reach/decision-signal-registry-v1.json');
var packageContract = readJson('package.json');
var reviewedArtifactPaths = Array.from(new Set(
  registry.signals.reduce(function(paths, signal) {
    return paths.concat(signal.artifactPaths || []);
  }, []).filter(function(artifactPath) {
    return /^data\/profile-reach\/aguada-restaurant-.*-review\.json$/.test(artifactPath);
  })
)).sort();

assert(reviewedArtifactPaths.length > 0, 'registry must expose reviewed profile/reach artifacts');

var reviewedArtifacts = reviewedArtifactPaths.map(function(artifactPath) {
  var artifact = readJson(artifactPath);
  assert.strictEqual(artifact.status, 'reviewed', artifactPath + ' must remain reviewed');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(artifact.reviewedAt), artifactPath + ' reviewedAt must be an ISO date');
  return artifact;
});
var latestReviewedAt = reviewedArtifacts.reduce(function(latest, artifact) {
  return artifact.reviewedAt > latest ? artifact.reviewedAt : latest;
}, '0000-00-00');

assert.strictEqual(profile.updatedAt, latestReviewedAt, 'profile updatedAt must equal the latest reviewed artifact date');
assert.strictEqual(registry.updatedAt, latestReviewedAt, 'registry updatedAt must equal the latest reviewed artifact date');

[
  'README.md',
  'docs/product-scope.md',
  'docs/standards/ieee-829-test-document.md',
  'docs/standards/ieee-830-srs.md',
  'docs/standards/ieee-1016-design-description.md'
].forEach(function(documentPath) {
  var contents = fs.readFileSync(path.join(root, documentPath), 'utf8');
  reviewedArtifactPaths.forEach(function(artifactPath) {
    assert(contents.indexOf(artifactPath) !== -1, documentPath + ' must reference ' + artifactPath);
  });
});

var focusedReviewScripts = Object.keys(packageContract.scripts).filter(function(scriptName) {
  return /^test:.*-signal-review$/.test(scriptName);
}).concat(['test:profile-reach-traceability']).sort();

[
  'README.md',
  'docs/standards/ieee-829-test-document.md',
  'docs/standards/ieee-830-srs.md'
].forEach(function(documentPath) {
  var contents = fs.readFileSync(path.join(root, documentPath), 'utf8');
  focusedReviewScripts.forEach(function(scriptName) {
    assert(contents.indexOf(scriptName) !== -1, documentPath + ' must reference ' + scriptName);
  });
});
