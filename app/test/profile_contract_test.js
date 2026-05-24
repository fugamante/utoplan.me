var assert = require('assert');
var fs = require('fs');
var path = require('path');

async function importBrowserModule(filePath) {
  var source = fs.readFileSync(filePath, 'utf8');
  var encoded = Buffer.from(source).toString('base64');

  return import('data:text/javascript;base64,' + encoded);
}

function memoryStore(initial) {
  var values = Object.assign({}, initial || {});

  return {
    getItem: function(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem: function(key, value) {
      values[key] = value;
    },
    removeItem: function(key) {
      delete values[key];
    }
  };
}

async function main() {
  var profile = await importBrowserModule(path.join(__dirname, '../public/js/profile.js'));
  var store = memoryStore();

  assert.strictEqual(profile.PROFILE_STORAGE_KEY, 'utoplan.planningProfile.v1');
  assert.deepStrictEqual(profile.DEFAULT_PROFILE, {
    businessIdea: '',
    municipalityId: 1,
    categoryId: 'professional_services'
  });
  assert.deepStrictEqual(profile.storedProfile({
    businessIdea: 'Accounting services',
    municipalityId: 7,
    categoryId: 'food_services'
  }, '2026-05-24T00:00:00.000Z'), {
    schemaVersion: 1,
    mode: 'browser-local-profile',
    updatedAt: '2026-05-24T00:00:00.000Z',
    profile: {
      businessIdea: 'Accounting services',
      selectedMunicipalityId: 7,
      selectedCategoryId: 'food_services'
    }
  });

  assert.deepStrictEqual(profile.normalizeProfile({
    businessIdea: 'Accounting services',
    municipalityId: '7',
    categoryId: 'food_services'
  }), {
    businessIdea: 'Accounting services',
    municipalityId: 7,
    categoryId: 'food_services'
  });

  assert.deepStrictEqual(profile.normalizeProfile({
    businessIdea: 'x'.repeat(200),
    municipalityId: 0,
    categoryId: '../bad'
  }), {
    businessIdea: 'x'.repeat(160),
    municipalityId: 1,
    categoryId: 'professional_services'
  });

  assert.deepStrictEqual(profile.readProfile(store), profile.DEFAULT_PROFILE);

  var result = profile.saveProfile(store, {
    businessIdea: 'Back office services',
    municipalityId: 1,
    categoryId: 'professional_services'
  });

  assert.strictEqual(result.saved, true);
  assert.deepStrictEqual(result.profile, {
    businessIdea: 'Back office services',
    municipalityId: 1,
    categoryId: 'professional_services'
  });
  assert.deepStrictEqual(profile.readProfile(store), result.profile);
  assert.strictEqual(profile.planningContextPath(result.profile), '/v1/planning/context?municipality=1&category=professional_services');
  assert.deepStrictEqual(profile.clearProfile(store), profile.DEFAULT_PROFILE);
  assert.deepStrictEqual(profile.readProfile(store), profile.DEFAULT_PROFILE);

  assert.deepStrictEqual(profile.readProfile(memoryStore({
    'utoplan.planningProfile.v1': '{not-json'
  })), profile.DEFAULT_PROFILE);
  assert.deepStrictEqual(profile.readProfile(memoryStore({
    'utoplan.planningProfile.v1': JSON.stringify({
      schemaVersion: 2,
      mode: 'browser-local-profile',
      profile: {}
    })
  })), profile.DEFAULT_PROFILE);

  assert.strictEqual(profile.saveProfile({
    getItem: function() {
      throw new Error('unavailable');
    },
    setItem: function() {
      throw new Error('unavailable');
    },
    removeItem: function() {
      throw new Error('unavailable');
    }
  }, {
    businessIdea: 'Local only',
    municipalityId: 1,
    categoryId: 'professional_services'
  }).saved, false);
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
