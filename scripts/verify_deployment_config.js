'use strict';

var URL = require('url').URL;

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

function hasValue(value) {
  return typeof value === 'string' && value.length > 0;
}

function parseHttpUrl(value, name, errors) {
  var parsed;

  if (!hasValue(value)) {
    errors.push(name + ' is required');
    return null;
  }

  try {
    parsed = new URL(value);
  } catch (error) {
    errors.push(name + ' must be a valid URL');
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    errors.push(name + ' must use http or https');
    return null;
  }

  return parsed;
}

function validatePort(value, name, errors) {
  var port;

  if (!hasValue(value)) {
    return;
  }

  port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(name + ' must be an integer from 1 to 65535');
  }
}

function validateDatabase(env, errors) {
  var hasUrl = hasValue(env.DATABASE_URL);
  var hasFields = hasValue(env.DATABASE_HOST) && hasValue(env.DATABASE_USER) && hasValue(env.DATABASE_DB);

  if (!hasUrl && !hasFields) {
    errors.push('DATABASE_URL or DATABASE_HOST, DATABASE_USER, and DATABASE_DB are required');
  }

  if (hasValue(env.DATABASE_PORT)) {
    validatePort(env.DATABASE_PORT, 'DATABASE_PORT', errors);
  }
}

function validateApp(env, errors) {
  parseHttpUrl(env.UTOPLAN_API_ORIGIN, 'UTOPLAN_API_ORIGIN', errors);

  if (env.UTOPLAN_DEMO_FIXTURE === '1') {
    errors.push('UTOPLAN_DEMO_FIXTURE must be unset in production');
  }

  validatePort(env.PORT, 'PORT', errors);
}

function validateApi(env, errors) {
  if (env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV must be production');
  }

  validateDatabase(env, errors);
  validatePort(env.PORT, 'PORT', errors);
}

function validateConfig(env, options) {
  var service = options.service || 'integrated';
  var errors = [];

  if (service !== 'app' && service !== 'api' && service !== 'integrated') {
    errors.push('service must be app, api, or integrated');
    return errors;
  }

  if (service === 'app' || service === 'integrated') {
    validateApp(env, errors);
  }

  if (service === 'api' || service === 'integrated') {
    validateApi(env, errors);
  }

  return errors;
}

function printResult(errors) {
  if (errors.length === 0) {
    console.error('Deployment configuration verified');
    return 0;
  }

  console.error('Deployment configuration is invalid:');
  errors.forEach(function(error) {
    console.error('- ' + error);
  });
  return 1;
}

function main() {
  var service = readArg(process.argv.slice(2), 'service', 'integrated');
  var errors = validateConfig(process.env, {
    service: service
  });

  process.exit(printResult(errors));
}

if (require.main === module) {
  main();
}

module.exports = {
  validateConfig: validateConfig
};
