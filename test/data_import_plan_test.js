'use strict';

var assert = require('assert');
var planner = require('../scripts/data_import_plan');

var plan = planner.planFixtureRows({
  cbps: [
    {
      fipscty: '001',
      cencty: '001',
      naics: '541',
      emp: '653',
      ap: '11348',
      est: '128',
      NAICS2012_TTL: 'Professional Services'
    },
    {
      fipscty: '001',
      cencty: '001',
      naics: '23----',
      emp: '0',
      ap: '0',
      est: '6',
      NAICS2012_TTL: 'Construction'
    }
  ],
  muns: [
    {
      municipio: '  San   Juan  ',
      countyfp: '127',
      cntyidfp: '72127'
    },
    {
      municipio: '',
      countyfp: '001'
    }
  ],
  unis: [
    {
      'Nombre de la Institución': 'American University of Puerto Rico',
      'Unidad Académica': '',
      'Principal Ejecutivo': 'Juan Nazario Torres',
      Telefono: '(787) 620-2040',
      'Dirección Pág Web': 'www.aupr.edu',
      'Correo Electrónico': 'jcnazario@aupr.edu',
      'Dirección Física': 'Carr # 2 KM 14.0',
      'Dirección Física 2': 'Barrio Hato Tejas',
      Pueblo: 'BAYAMON'
    },
    {
      'Nombre de la Institución': 'Sample College',
      'Dirección Física': 'Main Street',
      'Dirección Física 2': '',
      Pueblo: 'San Juan'
    },
    {
      'Nombre de la Institución': 'Unknown Institute',
      'Dirección Física': 'No Match',
      'Dirección Física 2': '',
      Pueblo: 'Ponce'
    }
  ],
  unisCoordinates: [
    {
      NAME: 'American University of Puerto Rico',
      STREET: 'Carr. #2, Km.14.4, Bo. Hato Tejas',
      CITY: 'Bayamon',
      LAT: 18.407058,
      LON: -66.186631
    },
    {
      NAME: 'Sample College',
      STREET: 'North Campus',
      CITY: 'San Juan',
      LAT: 18,
      LON: -66
    },
    {
      NAME: 'Sample College',
      STREET: 'South Campus',
      CITY: 'San Juan',
      LAT: 18.1,
      LON: -66.1
    }
  ]
});

assert.deepStrictEqual(plan.tables, {
  cbps: {
    accepted: 1,
    rejected: 1,
    manualReview: 0
  },
  muns: {
    accepted: 1,
    rejected: 1,
    manualReview: 0
  },
  unis: {
    accepted: 1,
    rejected: 0,
    manualReview: 2
  }
});

assert.strictEqual(plan.accepted.length, 3);
assert.strictEqual(plan.rejected.length, 2);
assert.strictEqual(plan.manualReview.length, 2);

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'cbps';
})[0].record, {
  total_indus: 653,
  total_anual: 11348,
  cnaic: 541,
  cnaic_name: 'Professional Services',
  county: 1,
  num_est: 128
});

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'muns';
})[0].record, {
  title: 'San Juan',
  county: 127
});

assert.deepStrictEqual(plan.accepted.filter(function(item) {
  return item.table === 'unis';
})[0].record, {
  title: 'American University of Puerto Rico',
  address: 'Carr # 2 KM 14.0, Barrio Hato Tejas, BAYAMON',
  desc: 'Juan Nazario Torres | (787) 620-2040 | www.aupr.edu | jcnazario@aupr.edu',
  lat: 18.407058,
  long: -66.186631
});

assert(plan.rejected.some(function(item) {
  return item.table === 'cbps' && item.reason.indexOf('NAICS code must be numeric') !== -1;
}));

assert(plan.rejected.some(function(item) {
  return item.table === 'muns' && item.reason.indexOf('municipality title is required') !== -1;
}));

assert(plan.manualReview.some(function(item) {
  return item.table === 'unis' && item.reason.indexOf('multiple coordinate rows') !== -1;
}));

assert(plan.manualReview.some(function(item) {
  return item.table === 'unis' && item.reason.indexOf('no exact normalized name') !== -1;
}));
