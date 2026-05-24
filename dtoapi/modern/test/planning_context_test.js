'use strict';

const assert = require('assert');
const planningContext = require('../lib/planning_context');

const categoryContract = planningContext.readCategoryContract();
const fixture = planningContext.readFixture();
const payload = planningContext.buildPayload(fixture, categoryContract);

assert.strictEqual(planningContext.naicsMatches(541, '541611'), true);
assert.strictEqual(planningContext.naicsMatches(541611, '541'), true);
assert.strictEqual(planningContext.naicsMatches(722, '541611'), false);
assert.strictEqual(planningContext.categoryById(categoryContract, 'professional_services').displayName, 'Professional services');
assert.strictEqual(planningContext.categoryById(categoryContract, 'missing'), null);
assert.strictEqual(planningContext.selectMunicipalityById(), 'SELECT id, title, county FROM muns WHERE id = $1 LIMIT 1');
assert.strictEqual(planningContext.selectCbpRowsByCounty(), 'SELECT id, total_indus, total_anual, cnaic, cnaic_name, county, num_est FROM cbps WHERE county = $1 ORDER BY id');
assert.deepStrictEqual(planningContext.municipalityFromRow({
  id: 7,
  title: 'Ponce',
  county: 113
}), {
  id: '7',
  title: 'Ponce',
  county: 113,
  geographyLevel: 'municipality'
});
assert.deepStrictEqual(planningContext.tableAssessmentByName(planningContext.readConfidenceContract(), 'cbps').preferredSourceId, 'datospr-cbp-2014-municipios');
assert.deepStrictEqual(planningContext.cbpRowFromDatabase({
  id: 8,
  total_indus: '10.5',
  total_anual: '20.5',
  cnaic: '541',
  cnaic_name: 'Professional Services',
  county: '1',
  num_est: '3'
}, planningContext.tableAssessmentByName(planningContext.readConfidenceContract(), 'cbps')), {
  sourceId: 'datospr-cbp-2014-municipios',
  rowIndex: 8,
  record: {
    total_indus: 10.5,
    total_anual: 20.5,
    cnaic: 541,
    cnaic_name: 'Professional Services',
    county: 1,
    num_est: 3
  },
  provenance: {
    sourceConfidence: 'medium',
    transformConfidence: 'low',
    productionReadiness: 'candidate-needs-review',
    sourceBacked: true,
    notes: 'Municipality-level CBP data is Puerto Rico-scoped, but important legacy field semantics are still unresolved.'
  }
});
assert.deepStrictEqual(planningContext.SUPPORTED_LIVE_QUERY_PARAMS, ['municipality', 'category']);
assert.deepStrictEqual(planningContext.parseLiveQuery(new URLSearchParams('municipality=1&category=professional_services'), categoryContract), {
  ok: true,
  query: {
    municipality: 1,
    category: 'professional_services'
  },
  error: null
});
assert.strictEqual(planningContext.parseLiveQuery(new URLSearchParams('category=professional_services'), categoryContract).ok, false);
assert.strictEqual(planningContext.parseLiveQuery(new URLSearchParams('municipality=0&category=professional_services'), categoryContract).ok, false);
assert.strictEqual(planningContext.parseLiveQuery(new URLSearchParams('municipality=abc&category=professional_services'), categoryContract).ok, false);
assert.strictEqual(planningContext.parseLiveQuery(new URLSearchParams('municipality=1&category=missing'), categoryContract).ok, false);
assert.strictEqual(planningContext.parseLiveQuery(new URLSearchParams('municipality=1&category=professional_services&score=true'), categoryContract).ok, false);

assert.strictEqual(payload.schemaVersion, 1);
assert.strictEqual(payload.scope, 'puerto-rico-only');
assert.strictEqual(payload.mode, 'demo-fixture');
assert.strictEqual(payload.selectedMunicipality.title, 'Adjuntas');
assert.strictEqual(payload.selectedCategory.id, 'professional_services');
assert.strictEqual(payload.facts.length, 3);
assert.deepStrictEqual(payload.facts.map(function(fact) {
  return fact.factType;
}), [
  'establishment_count',
  'annual_payroll',
  'employment_count'
]);
assert.strictEqual(payload.signals.length, 0);
assert.strictEqual(payload.confidence.label, 'low');
assert(payload.unresolvedQuestions.some(function(question) {
  return question.indexOf('Keep confidence and limitations visible') !== -1;
}));
assert(payload.suggestedNextChecks.some(function(check) {
  return check.indexOf('Add ACS') !== -1;
}));

payload.facts.forEach(function(fact) {
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
});

assert.throws(function() {
  planningContext.buildPayload(Object.assign({}, fixture, {
    selectedCategoryId: 'missing'
  }), categoryContract);
}, /Unknown business category/);
