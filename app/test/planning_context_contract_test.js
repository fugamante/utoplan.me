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
        municipality: {
          code: '001',
          label: 'Municipality code 001'
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
          label: 'Municipality code 002'
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
  assert.strictEqual(planningContext.describeSummary(normalized[0]), 'Municipality code 001 - Construction service');

  assert.deepStrictEqual(planningContext.normalizePlanningContext({}), []);
  assert.deepStrictEqual(planningContext.normalizePlanningContext({ data: null }), []);

  var rendered = {
    status: '',
    listCount: 0
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
          appendChild: function() {
            rendered.listCount += 1;
          }
        };
      }

      return null;
    },
    createElement: function() {
      return {
        className: '',
        textContent: '',
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
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
