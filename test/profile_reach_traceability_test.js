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
var roadmapContents = fs.readFileSync(path.join(root, 'docs', 'modernization-roadmap.md'), 'utf8');
var productScopeContents = fs.readFileSync(path.join(root, 'docs', 'product-scope.md'), 'utf8');
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
var sourceGapSignals = registry.signals.filter(function(signal) {
  return signal.sourceType === 'source-gap';
});
var inspectionWindowSignal = registry.signals.find(function(signal) {
  return signal.id === 'strategic-inspection-service-window-baseline';
});

assert.strictEqual(profile.updatedAt, latestReviewedAt, 'profile updatedAt must equal the latest reviewed artifact date');
assert.strictEqual(registry.updatedAt, latestReviewedAt, 'registry updatedAt must equal the latest reviewed artifact date');
assert.deepStrictEqual(
  sourceGapSignals.map(function(signal) { return signal.id; }).sort(),
  ['local-supplier-route-gap'],
  'registry source-gap set must stay narrowed to the sole documented local supplier lane'
);
assert(inspectionWindowSignal, 'registry must retain the documented inspection-window signal');
assert(
  inspectionWindowSignal.interpretationLimits.some(function(limit) {
    return limit.indexOf('completed-inspection count, completion rate, or distribution of elapsed inspection time') !== -1;
  }),
  'inspection-window signal must keep the completed-inspection throughput limitation explicit'
);
assert(
  /completed-\s*inspection count, completion rate, or elapsed-time distribution with a defined\s+reporting period/.test(roadmapContents),
  'roadmap must keep the completed-inspection evidence-depth lane explicit'
);
assert(
  roadmapContents.indexOf("`local-supplier-route-gap` for the small/local scenario") !== -1,
  'roadmap must keep the sole literal source gap explicit'
);
assert(
  /Completed-\s*inspection throughput is the current high-criticality evidence-depth lane;/.test(productScopeContents),
  'product scope must keep the current inspection-throughput lane explicit'
);
assert(
  productScopeContents.indexOf('`local-supplier-route-gap` remains the sole literal source gap.') !== -1,
  'product scope must keep the sole literal source gap explicit'
);

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
