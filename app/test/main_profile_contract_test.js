var assert = require('assert');
var fs = require('fs');
var path = require('path');

async function importMainModule() {
  var profileSource = fs.readFileSync(path.join(__dirname, '../public/js/profile.js'), 'utf8');
  var profileUrl = 'data:text/javascript;base64,' + Buffer.from(profileSource).toString('base64');
  var mainSource = fs.readFileSync(path.join(__dirname, '../public/js/main.js'), 'utf8')
    .replace('from "./profile.js";', 'from "' + profileUrl + '";');
  var mainUrl = 'data:text/javascript;base64,' + Buffer.from(mainSource).toString('base64');

  global.window = {
    localStorage: {
      getItem: function() {
        throw new Error('blocked');
      },
      setItem: function() {
        throw new Error('blocked');
      },
      removeItem: function() {
        throw new Error('blocked');
      }
    }
  };
  global.document = {
    readyState: 'loading',
    addEventListener: function() {},
    querySelector: function() {
      return null;
    },
    querySelectorAll: function() {
      return [];
    }
  };

  return import(mainUrl);
}

async function main() {
  var module = await importMainModule();
  var saved = {};

  module.NOOP_PROFILE_STORE.setItem('key', 'value');
  assert.strictEqual(module.NOOP_PROFILE_STORE.getItem('key'), 'value');
  module.NOOP_PROFILE_STORE.removeItem('key');
  assert.strictEqual(module.NOOP_PROFILE_STORE.getItem('key'), null);

  global.document = {
    querySelectorAll: function() {
      return [];
    },
    querySelector: function(selector) {
      if (selector === '[data-ui="profile-panel"]') {
        return {};
      }

      if (selector === '[data-ui="profile-status"]') {
        return {
          textContent: ''
        };
      }

      if (selector === '[data-ui="profile-business-idea"]') {
        return {
          value: ''
        };
      }

      if (selector === '[data-ui="profile-municipality"]') {
        return {
          value: ''
        };
      }

      if (selector === '[data-ui="profile-category"]') {
        return {
          value: ''
        };
      }

      if (selector === '[data-ui="profile-context-link"]') {
        return {
          setAttribute: function(name, value) {
            saved[name] = value;
          }
        };
      }

      if (selector === '[data-ui="profile-save"]' || selector === '[data-ui="profile-load"]' || selector === '[data-ui="profile-clear"]') {
        return {
          addEventListener: function() {}
        };
      }

      return null;
    }
  };

  Object.defineProperty(global.window, 'localStorage', {
    configurable: true,
    get: function() {
      throw new Error('storage blocked');
    }
  });

  module.initProfileControls();
  assert.strictEqual(saved.href, '/v1/planning/context?municipality=1&category=professional_services');
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
