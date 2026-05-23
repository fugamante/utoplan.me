'use strict';

var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var URL = require('url').URL;

var DEFAULT_REGISTRY = path.join(__dirname, '..', 'data', 'sources', 'puerto-rico.json');
var DEFAULT_CACHE_DIR = path.join(__dirname, '..', '.cache', 'utoplan-data');

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

function hasFlag(args, name) {
  return args.indexOf('--' + name) !== -1;
}

function ensureDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    return;
  }

  ensureDir(path.dirname(dirPath));
  fs.mkdirSync(dirPath);
}

function readRegistry(registryPath) {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function sourceDownloadUrl(source) {
  return source.resourceUrl || source.apiUrl || null;
}

function sourceExtension(source) {
  var rawUrl = sourceDownloadUrl(source);
  var pathname;
  var extension;

  if (!rawUrl) {
    return '.dat';
  }

  pathname = new URL(rawUrl).pathname;
  extension = path.extname(pathname);

  if (extension) {
    return extension;
  }

  return source.apiUrl ? '.json' : '.dat';
}

function cachePathFor(cacheDir, source) {
  return path.join(cacheDir, source.id + sourceExtension(source));
}

function metadataPathFor(cacheDir, source) {
  return path.join(cacheDir, source.id + '.metadata.json');
}

function validateSource(source) {
  var rawUrl = sourceDownloadUrl(source);
  var parsed;

  if (!rawUrl) {
    return source.id + ' does not include a resourceUrl or apiUrl';
  }

  parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') {
    return source.id + ' must use an https source URL';
  }

  if (source.scope !== 'puerto-rico' && source.scope !== 'puerto-rico-filtered') {
    return source.id + ' must be Puerto Rico scoped';
  }

  if (source.scope === 'puerto-rico-filtered' && !source.scopeFilter) {
    return source.id + ' must include a scopeFilter';
  }

  return null;
}

function defaultFetch(url) {
  return new Promise(function(resolve, reject) {
    var client = url.indexOf('https:') === 0 ? https : http;

    client.get(url, function(response) {
      var chunks = [];

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error('HTTP ' + response.statusCode + ' for ' + url));
        return;
      }

      response.on('data', function(chunk) {
        chunks.push(chunk);
      });

      response.on('end', function() {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

function cacheSource(source, options) {
  var cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  var now = options.now || new Date().toISOString();
  var fetch = options.fetch || defaultFetch;
  var rawUrl = sourceDownloadUrl(source);
  var validationError = validateSource(source);

  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  ensureDir(cacheDir);

  return fetch(rawUrl).then(function(content) {
    var dataPath = cachePathFor(cacheDir, source);
    var metadataPath = metadataPathFor(cacheDir, source);
    var buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');

    fs.writeFileSync(dataPath, buffer);
    fs.writeFileSync(metadataPath, JSON.stringify({
      id: source.id,
      url: rawUrl,
      sourceUrl: source.sourceUrl,
      publisher: source.publisher,
      license: source.license,
      scope: source.scope,
      scopeFilter: source.scopeFilter || null,
      retrievedAt: now,
      bytes: buffer.length,
      dataPath: path.relative(process.cwd(), dataPath)
    }, null, 2) + '\n');

    return {
      id: source.id,
      dataPath: dataPath,
      metadataPath: metadataPath,
      bytes: buffer.length
    };
  });
}

function selectedSources(registry, args) {
  var sourceId = readArg(args, 'source', null);

  if (hasFlag(args, 'all')) {
    return registry.sources;
  }

  if (!sourceId) {
    throw new Error('Missing required --source=<id> or --all argument');
  }

  return registry.sources.filter(function(source) {
    return source.id === sourceId;
  });
}

function run(args) {
  var registryPath = readArg(args, 'registry', DEFAULT_REGISTRY);
  var cacheDir = readArg(args, 'cache-dir', DEFAULT_CACHE_DIR);
  var registry;
  var sources;

  try {
    registry = readRegistry(registryPath);
    sources = selectedSources(registry, args);
  } catch (error) {
    console.error(error.message);
    return Promise.resolve(1);
  }

  if (sources.length === 0) {
    console.error('No registered source matched the requested id');
    return Promise.resolve(1);
  }

  return sources.reduce(function(chain, source) {
    return chain.then(function(results) {
      return cacheSource(source, {
        cacheDir: cacheDir
      }).then(function(result) {
        console.error('Cached ' + result.id + ' (' + result.bytes + ' bytes)');
        results.push(result);
        return results;
      });
    });
  }, Promise.resolve([])).then(function() {
    return 0;
  }).catch(function(error) {
    console.error('Source cache failed: ' + error.message);
    return 1;
  });
}

if (require.main === module) {
  run(process.argv.slice(2)).then(function(status) {
    process.exit(status);
  });
}

module.exports = {
  cachePathFor: cachePathFor,
  cacheSource: cacheSource,
  metadataPathFor: metadataPathFor,
  readRegistry: readRegistry,
  run: run,
  selectedSources: selectedSources,
  sourceDownloadUrl: sourceDownloadUrl,
  sourceExtension: sourceExtension,
  validateSource: validateSource
};
