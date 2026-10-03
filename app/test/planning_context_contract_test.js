var assert = require('assert');
var fs = require('fs');
var path = require('path');

async function importBrowserModule(filePath) {
  var source = fs.readFileSync(filePath, 'utf8');
  var encoded = Buffer.from(source).toString('base64');

  return import('data:text/javascript;base64,' + encoded);
}

async function main() {
  var planningContext = await importBrowserModule(path.join(__dirname, '../public/js/planning_context.js'));

  var normalized = planningContext.normalizePlanningContext({
    data: [
      {
        id: 'mun001_construction',
        status: 'candidate-needs-review',
        updatedAt: '2026-05-29',
        sourceCount: 1,
        municipality: {
          code: '001',
          label: 'Adjuntas'
        },
        businessCategory: {
          id: 'construction-service',
          displayName: 'Construction service'
        },
        confidence: {
          overall: 'low'
        },
        guardrails: {
          descriptiveOnly: true,
          noScores: true,
          noRankings: true,
          noRecommendations: true
        }
      },
      {
        id: 'invalid_guardrails',
        municipality: {
          code: '002',
          label: 'Unknown municipality'
        },
        businessCategory: {
          id: 'restaurant-cafe',
          displayName: 'Restaurant or cafe'
        },
        confidence: {
          overall: 'medium'
        },
        guardrails: {
          descriptiveOnly: true,
          noScores: false,
          noRankings: true,
          noRecommendations: true
        }
      }
    ]
  });

  assert.strictEqual(normalized.length, 1, 'only descriptive guardrail-complete summaries should be accepted');
  assert.strictEqual(normalized[0].id, 'mun001_construction');
  assert.strictEqual(normalized[0].status, 'candidate-needs-review');
  assert.strictEqual(normalized[0].updatedAt, '2026-05-29');
  assert.strictEqual(normalized[0].sourceCount, 1);
  assert.strictEqual(planningContext.describeFixtureStatus(normalized[0].status), 'Candidate review required');
  assert.strictEqual(planningContext.describeSummary(normalized[0]), 'Adjuntas - Construction service');

  assert.deepStrictEqual(planningContext.normalizePlanningContext({}), []);
  assert.deepStrictEqual(planningContext.normalizePlanningContext({ data: null }), []);
  assert.strictEqual(planningContext.normalizePlanningContextDetail({}), null);

  var detail = planningContext.normalizePlanningContextDetail({
    data: [{
      id: 'mun001_construction',
      status: 'candidate-needs-review',
      updatedAt: '2026-05-29',
      sourceCount: 1,
      municipality: {
        code: '001',
        label: 'Adjuntas'
      },
      businessCategory: {
        id: 'construction-service',
        displayName: 'Construction service'
      },
      confidence: {
        overall: 'low',
        rationale: [
          'Category mapping is candidate-grade.',
          'Disclosure-limited values reduce confidence.'
        ]
      },
      cbpFacts: [{
        sourceRow: {
          ap_nf: 'D',
          emp_nf: 'D'
        },
        naics: '236118',
        naicsTitle: 'Residential Remodelers',
        establishments: 2,
        annualPayroll: 0,
        employment: 0,
        notes: 'Disclosure-limited row should not imply precision.'
      }],
      limitations: [
        'Descriptive planning context only.'
      ],
      sourceProvenance: {
        sourceCount: 1,
        sources: [{
          sourceId: 'datospr-cbp-2014-municipios',
          publisher: 'U.S. Census Bureau',
          portal: 'Datos.PR',
          license: 'Creative Commons Attribution',
          retrievedAt: '2026-05-24',
          targetTables: [
            'cbps',
            'muns'
          ],
          legacySchemaCoverage: {
            cnaic: 'exact',
            county: 'exact'
          }
        }]
      },
      unresolvedQuestions: [
        'What canonical display-name source should be used?'
      ],
      guardrails: {
        descriptiveOnly: true,
        noScores: true,
        noRankings: true,
        noRecommendations: true
      }
    }]
  });

  assert(detail, 'detail payload should normalize');
  assert.strictEqual(detail.id, 'mun001_construction');
  assert.strictEqual(detail.status, 'candidate-needs-review');
  assert.strictEqual(detail.updatedAt, '2026-05-29');
  assert.strictEqual(detail.confidence.rationale.length, 2);
  assert.strictEqual(detail.cbpFacts[0].naicsTitle, 'Residential Remodelers');
  assert.strictEqual(detail.cbpFacts[0].display.annualPayroll, 'masked (disclosure-limited)');
  assert.strictEqual(detail.cbpFacts[0].display.employment, 'masked (disclosure-limited)');
  assert.strictEqual(detail.sourceProvenance.sourceCount, 1);
  assert.strictEqual(detail.sourceProvenance.sources[0].sourceId, 'datospr-cbp-2014-municipios');

  var rendered = {
    status: '',
    listCount: 0,
    detailStatus: '',
    detailListCount: 0
  };

  var documentStub = {
    querySelector: function(selector) {
      if (selector === '[data-ui="planning-context-status"]') {
        return {
          set textContent(value) {
            rendered.status = value;
          },
          get textContent() {
            return rendered.status;
          }
        };
      }

      if (selector === '[data-ui="planning-context-list"]') {
        return {
          innerHTML: '',
          className: '',
          appendChild: function() {
            rendered.listCount += 1;
          }
        };
      }

      if (selector === '[data-ui="planning-context-detail-status"]') {
        return {
          set textContent(value) {
            rendered.detailStatus = value;
          },
          get textContent() {
            return rendered.detailStatus;
          }
        };
      }

      if (selector === '[data-ui="planning-context-detail"]') {
        return {
          innerHTML: '',
          appendChild: function(node) {
            if (node && node.className === 'planningContextSection') {
              rendered.detailListCount += 1;
            }
          }
        };
      }

      return null;
    },
    createElement: function() {
      return {
        className: '',
        textContent: '',
        setAttribute: function() {},
        classList: {
          add: function() {}
        },
        appendChild: function() {}
      };
    }
  };

  planningContext.renderPlanningContext(documentStub, {
    available: true,
    summaries: normalized
  });

  assert.strictEqual(rendered.status, 'Descriptive planning-context options (no scores, rankings, or recommendations).');
  assert.strictEqual(rendered.listCount, 1);

  planningContext.renderPlanningContextDetail(documentStub, {
    available: true,
    detail: detail
  });

  assert.strictEqual(rendered.detailStatus, 'Descriptive detail only (confidence, limitations, provenance, unresolved questions).');
  assert.strictEqual(rendered.detailListCount, 5);
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
