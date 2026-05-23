'use strict';

const assert = require('assert');
const sourceMetadata = require('../lib/source_metadata');

const contract = {
  schemaVersion: 1,
  scope: 'puerto-rico-only',
  sourceRegistry: 'data/sources/puerto-rico.json',
  schemaMapping: 'data/mappings/puerto-rico-schema-map.json',
  normalizationMapping: 'data/mappings/puerto-rico-normalization.json',
  rowProvenanceFields: ['sourceId', 'sourceBacked'],
  tableAssessments: [
    {
      table: 'unis',
      sourceIds: ['datospr-higher-ed-directory-2017-18'],
      preferredSourceId: 'datospr-higher-ed-directory-2017-18',
      sourceConfidence: 'medium',
      transformConfidence: 'low',
      productionReadiness: 'candidate-needs-review',
      sourceBacked: true,
      requiredBeforeApiPromotion: ['Review coordinate joins.'],
      notes: 'Candidate source-backed rows.'
    }
  ],
  blockedTables: [
    {
      table: 'businesses',
      sourceConfidence: 'blocked',
      transformConfidence: 'blocked',
      productionReadiness: 'blocked',
      sourceBacked: false,
      reason: 'No confirmed source.'
    }
  ],
  promotionRule: 'Rows need registered sources before promotion.'
};

const payload = sourceMetadata.buildPayload(contract);

assert.strictEqual(payload.schemaVersion, 1);
assert.strictEqual(payload.scope, 'puerto-rico-only');
assert.strictEqual(payload.tables.unis.dataClass, 'source-backed-candidate');
assert.strictEqual(payload.tables.unis.sourceBacked, true);
assert.deepStrictEqual(payload.tables.unis.sourceIds, ['datospr-higher-ed-directory-2017-18']);
assert.strictEqual(payload.blockedTables.businesses.dataClass, 'blocked');
assert.strictEqual(payload.blockedTables.businesses.sourceBacked, false);
assert.strictEqual(payload.blockedTables.businesses.reason, 'No confirmed source.');

const livePayload = sourceMetadata.payload();

assert.strictEqual(livePayload.scope, 'puerto-rico-only');
assert.strictEqual(livePayload.tables.cbps.dataClass, 'source-backed-candidate');
assert.strictEqual(livePayload.tables.muns.sourceBacked, true);
assert.strictEqual(livePayload.tables.unis.productionReadiness, 'candidate-needs-review');
assert.strictEqual(livePayload.blockedTables.cdepts.dataClass, 'blocked');
assert.strictEqual(livePayload.blockedTables.businesses.productionReadiness, 'blocked');
assert.strictEqual(livePayload.blockedTables.grade_cs.sourceBacked, false);
