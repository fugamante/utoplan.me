'use strict';

var fs = require('fs');
var path = require('path');

var DEFAULT_CATEGORY_PATH = path.join(__dirname, '..', 'data', 'mappings', 'puerto-rico-business-categories.json');

function readArg(args, name, defaultValue) {
  var prefix = '--' + name + '=';
  var value = defaultValue;

  args.forEach(function(arg) {
    if (arg.indexOf(prefix) === 0) {
      value = arg.slice(prefix.length);
    }
  });

  return value;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function readCategoryContract(filePath) {
  return readJsonFile(filePath || DEFAULT_CATEGORY_PATH);
}

function categoryById(contract, categoryId) {
  return (contract.categories || []).filter(function(category) {
    return category.id === categoryId;
  })[0] || null;
}

function naicsMatches(rowCode, categoryCode) {
  var row = String(rowCode || '');
  var category = String(categoryCode || '');

  return row === category || row.indexOf(category) === 0 || category.indexOf(row) === 0;
}

function matchedNaics(rowCode, category) {
  return category.mappedNaics.filter(function(naics) {
    return naicsMatches(rowCode, naics.code);
  });
}

function confidenceFromFacts(facts) {
  if (facts.some(function(fact) {
    return fact.confidence.transform === 'low' || fact.confidence.source === 'low';
  })) {
    return 'low';
  }

  if (facts.some(function(fact) {
    return fact.confidence.transform === 'medium' || fact.confidence.source === 'medium';
  })) {
    return 'medium';
  }

  return facts.length > 0 ? 'high' : 'unknown';
}

function cbpFacts(input, category) {
  var municipality = input.selectedMunicipality || {};

  return (input.cbps || []).reduce(function(facts, row) {
    var record = row.record || {};
    var matches;
    var baseFact;

    if (Number(record.county) !== Number(municipality.county)) {
      return facts;
    }

    matches = matchedNaics(record.cnaic, category);
    if (matches.length === 0) {
      return facts;
    }

    baseFact = {
      table: 'cbps',
      sourceId: row.sourceId,
      rowIndex: row.rowIndex,
      place: {
        id: municipality.id,
        title: municipality.title,
        county: municipality.county,
        geographyLevel: municipality.geographyLevel
      },
      naics: {
        code: String(record.cnaic),
        title: record.cnaic_name,
        matchedCategoryCodes: matches.map(function(match) {
          return match.code;
        })
      },
      confidence: {
        source: row.provenance ? row.provenance.sourceConfidence : 'unknown',
        transform: row.provenance ? row.provenance.transformConfidence : 'unknown',
        productionReadiness: row.provenance ? row.provenance.productionReadiness : 'unknown',
        sourceBacked: row.provenance ? !!row.provenance.sourceBacked : false
      },
      limitations: [
        'CBP facts describe observed business-pattern context, not demand, profitability, or recommendation rank.'
      ]
    };

    facts.push(Object.assign({}, baseFact, {
      factType: 'establishment_count',
      value: record.num_est,
      unit: 'establishments'
    }));
    facts.push(Object.assign({}, baseFact, {
      factType: 'annual_payroll',
      value: record.total_anual,
      unit: 'source-defined annual payroll'
    }));
    facts.push(Object.assign({}, baseFact, {
      factType: 'employment_count',
      value: record.total_indus,
      unit: 'employees or jobs, pending source-label review'
    }));

    return facts;
  }, []);
}

function buildContext(input, categoryContract) {
  var category = categoryById(categoryContract, input.selectedCategoryId);
  var facts;

  if (!category) {
    throw new Error('Unknown business category: ' + input.selectedCategoryId);
  }

  facts = cbpFacts(input, category);

  return {
    schemaVersion: 1,
    scope: 'puerto-rico-only',
    generatedFrom: {
      categoryMapping: 'data/mappings/puerto-rico-business-categories.json',
      fixture: 'data/fixtures/non-production/planning-context-fixture.json'
    },
    selectedMunicipality: input.selectedMunicipality,
    selectedCategory: {
      id: category.id,
      displayName: category.displayName,
      mappedNaics: category.mappedNaics,
      assumptions: category.assumptions,
      confidence: category.confidence,
      status: category.status,
      limitations: category.limitations
    },
    facts: facts,
    signals: [],
    confidence: {
      label: confidenceFromFacts(facts),
      basis: 'Lowest visible source or transform confidence among selected facts.'
    },
    unresolvedQuestions: categoryContract.requiredBeforePlanningEndpoint.concat(category.limitations),
    suggestedNextChecks: [
      'Review source confidence and transform confidence before using these facts in UI planning summaries.',
      'Confirm that the selected NAICS mappings are appropriate for the business idea.',
      'Add ACS, unemployment, zoning, or permit context before presenting feasibility signals.'
    ]
  };
}

function run(args) {
  var fixturePath = readArg(args, 'fixture', null);
  var categoryPath = readArg(args, 'categories', DEFAULT_CATEGORY_PATH);
  var outPath = readArg(args, 'out', null);
  var input;
  var categories;
  var context;

  if (!fixturePath) {
    console.error('Missing required --fixture=<path> argument');
    return 1;
  }

  try {
    input = readJsonFile(fixturePath);
    categories = readCategoryContract(categoryPath);
    context = buildContext(input, categories);
  } catch (error) {
    console.error('Failed to build planning context: ' + error.message);
    return 1;
  }

  try {
    if (outPath) {
      writeJsonFile(outPath, context);
    } else {
      process.stdout.write(JSON.stringify(context, null, 2) + '\n');
    }
  } catch (error) {
    console.error('Failed to write planning context: ' + error.message);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}

module.exports = {
  buildContext: buildContext,
  categoryById: categoryById,
  matchedNaics: matchedNaics,
  naicsMatches: naicsMatches,
  readCategoryContract: readCategoryContract,
  run: run
};
