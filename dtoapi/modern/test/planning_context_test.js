'use strict';

const assert = require('assert');
const planningContext = require('../lib/planning_context');

const ids = planningContext.listFixtureIds();
assert(Array.isArray(ids));
assert(ids.length >= 2, 'expected at least two planning-context fixtures');
assert(ids.includes('mun001_construction'));
assert(ids.includes('mun003_restaurant'));

const summaries = planningContext.listSummaries();
assert(Array.isArray(summaries));
assert.strictEqual(summaries.length, ids.length);

summaries.forEach(function(summary) {
  assert.strictEqual(summary.schemaVersion, 1);
  assert.strictEqual(summary.scope, 'puerto-rico-planning-candidate');
  assert.strictEqual(summary.guardrails.descriptiveOnly, true);
  assert.strictEqual(summary.guardrails.noScores, true);
  assert.strictEqual(summary.guardrails.noRankings, true);
  assert.strictEqual(summary.guardrails.noRecommendations, true);
  assert(summary.municipality.code);
  assert(summary.municipality.label);
  assert(summary.businessCategory.id);
  assert(summary.confidence.overall);
});

const adjuntasSummary = summaries.find(function(summary) {
  return summary.id === 'mun001_construction';
});
assert(adjuntasSummary, 'summary should exist for mun001_construction');
assert.strictEqual(adjuntasSummary.municipality.label, 'Adjuntas');

const detail = planningContext.findDetail('mun003_restaurant');
assert(detail, 'detail should exist for known fixture id');
assert.strictEqual(detail.id, 'mun003_restaurant');
assert.strictEqual(detail.guardrails.descriptiveOnly, true);
assert.strictEqual(detail.businessCategory.id, 'restaurant-cafe');
assert.strictEqual(detail.selection.municipalityCode, '003');
assert.strictEqual(detail.municipality.label, 'Aguada');
assert(Array.isArray(detail.cbpFacts));
assert(detail.cbpFacts.length >= 1);

const missing = planningContext.findDetail('missing-fixture');
assert.strictEqual(missing, null);

const invalid = planningContext.findDetail('../mun001_construction');
assert.strictEqual(invalid, null);
