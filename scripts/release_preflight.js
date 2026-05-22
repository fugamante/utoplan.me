'use strict';

var verifier = require('./verify_deployment_config');

function sampleEnv(env) {
  return Object.assign({}, env, {
    NODE_ENV: 'production',
    PORT: '3001',
    UTOPLAN_API_ORIGIN: 'http://api:3001',
    DATABASE_HOST: 'postgres.example.internal',
    DATABASE_PORT: '5432',
    DATABASE_USER: 'utoplan',
    DATABASE_DB: 'utoplan'
  });
}

function serviceEnv(env, service) {
  if (service === 'app') {
    return Object.assign({}, env, {
      PORT: env.UTOPLAN_APP_PORT || env.PORT || '8080'
    });
  }

  if (service === 'api') {
    return Object.assign({}, env, {
      PORT: env.UTOPLAN_API_PORT || env.PORT || '3001'
    });
  }

  return env;
}

function run(env) {
  var activeEnv = env.UTOPLAN_RELEASE_SAMPLE === '1' ? sampleEnv(env) : env;
  var results = ['app', 'api'].map(function(service) {
    return {
      service: service,
      errors: verifier.validateConfig(serviceEnv(activeEnv, service), {
        service: service
      })
    };
  });
  var failures = results.filter(function(result) {
    return result.errors.length > 0;
  });

  if (failures.length === 0) {
    console.error('Release preflight verified app and API deployment configuration');
    return 0;
  }

  console.error('Release preflight failed:');
  failures.forEach(function(result) {
    console.error('[' + result.service + ']');
    result.errors.forEach(function(error) {
      console.error('- ' + error);
    });
  });
  return 1;
}

if (require.main === module) {
  process.exit(run(process.env));
}

module.exports = {
  run: run
};
