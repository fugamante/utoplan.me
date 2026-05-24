'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var planningContext = require('../scripts/planning_context');

var fixturePath = path.join(__dirname, '..', 'data', 'fixtures', 'non-production', 'planning-context-fixture.json');
var categoryPath = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');
var fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
var categories = planningContext.readCategoryContract(categoryPath);
var context = planningContext.buildContext(fixture, categories);
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utoplan-planning-context-'));
var outPath = path.join(tmpDir, 'context.json');
var cliResult;
var failedResult;

assert.strictEqual(planningContext.naicsMatches(541, '541611'), true);
assert.strictEqual(planningContext.naicsMatches(541611, '541'), true);
assert.strictEqual(planningContext.naicsMatches(722, '541611'), false);
assert.strictEqual(planningContext.categoryById(categories, 'professional_services').displayName, 'Professional services');
assert.strictEqual(planningContext.categoryById(categories, 'missing'), null);

assert.strictEqual(context.schemaVersion, 1);
assert.strictEqual(context.scope, 'puerto-rico-only');
assert.strictEqual(context.selectedMunicipality.title, 'Adjuntas');
assert.strictEqual(context.selectedCategory.id, 'professional_services');
assert.strictEqual(context.selectedCategory.mappedNaics.length > 0, true);
assert.strictEqual(context.signals.length, 0, 'planning context must not create scores or signals yet');
assert.strictEqual(context.confidence.label, 'low');
assert(context.unresolvedQuestions.some(function(question) {
  return question.indexOf('Keep confidence and limitations visible') !== -1;
}));
assert(context.suggestedNextChecks.some(function(check) {
  return check.indexOf('Add ACS') !== -1;
}));

assert.deepStrictEqual(context.facts.map(function(fact) {
  return fact.factType;
}), [
  'establishment_count',
  'annual_payroll',
  'employment_count'
]);

context.facts.forEach(function(fact) {
  assert.strictEqual(fact.table, 'cbps');
  assert.strictEqual(fact.place.county, 1);
  assert.strictEqual(fact.naics.code, '541');
  assert.deepStrictEqual(fact.naics.matchedCategoryCodes, [
    '541110',
    '541211',
    '541611',
    '541990'
  ]);
  assert.strictEqual(fact.confidence.source, 'medium');
  assert.strictEqual(fact.confidence.transform, 'low');
  assert.strictEqual(fact.confidence.sourceBacked, true);
  assert(fact.limitations[0].indexOf('not demand') !== -1);
});

assert.strictEqual(context.facts.filter(function(fact) {
  return fact.factType === 'establishment_count';
})[0].value, 128);
assert.strictEqual(context.facts.filter(function(fact) {
  return fact.factType === 'annual_payroll';
})[0].value, 11348);
assert.strictEqual(context.facts.filter(function(fact) {
  return fact.factType === 'employment_count';
})[0].value, 653);

assert.throws(function() {
  planningContext.buildContext(Object.assign({}, fixture, {
    selectedCategoryId: 'missing'
  }), categories);
}, /Unknown business category/);

cliResult = childProcess.spawnSync(process.execPath, [
  'scripts/planning_context.js',
  '--fixture=' + fixturePath,
  '--out=' + outPath
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(cliResult.status, 0);
assert.strictEqual(cliResult.stderr, '');
assert.deepStrictEqual(JSON.parse(fs.readFileSync(outPath, 'utf8')), context);

failedResult = childProcess.spawnSync(process.execPath, [
  'scripts/planning_context.js'
], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert.strictEqual(failedResult.status, 1);
assert(failedResult.stderr.indexOf('Missing required --fixture=<path> argument') !== -1);

fs.rmSync(tmpDir, {
  recursive: true,
  force: true
});
