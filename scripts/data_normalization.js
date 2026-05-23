'use strict';

var LEGAL_SUFFIXES = {
  campus: true,
  college: true,
  corporation: true,
  de: true,
  del: true,
  inc: true,
  instituto: true,
  institution: true,
  llc: true,
  of: true,
  recinto: true,
  school: true,
  universidad: true,
  university: true
};

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTokenText(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeName(value) {
  var text = normalizeTokenText(value);

  return text.split(' ').filter(function(token) {
    return token && !LEGAL_SUFFIXES[token];
  }).join(' ');
}

function normalizeAddress(value) {
  return normalizeTokenText(value)
    .replace(/\bcarretera\b/g, 'carr')
    .replace(/\bavenida\b/g, 'ave')
    .replace(/\bcalle\b/g, 'calle')
    .replace(/\bkilometro\b/g, 'km')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNaics(value) {
  var text = String(value || '').trim();

  if (!/^[0-9]+$/.test(text)) {
    return {
      ok: false,
      reason: 'NAICS code must be numeric for the current integer schema',
      value: null
    };
  }

  return {
    ok: true,
    reason: null,
    value: parseInt(text, 10)
  };
}

function normalizeIntegerCode(value, label) {
  var text = String(value || '').trim();

  if (!/^[0-9]+$/.test(text)) {
    return {
      ok: false,
      reason: (label || 'code') + ' must be numeric',
      value: null
    };
  }

  return {
    ok: true,
    reason: null,
    value: parseInt(text, 10)
  };
}

function normalizeCbpCounty(row) {
  var selected = !isBlank(row.fipscty) ? row.fipscty : row.cencty;
  return normalizeIntegerCode(selected, 'CBP county code');
}

function normalizeMunCounty(row) {
  var selected = row.countyfp;

  if (isBlank(selected) && !isBlank(row.cntyidfp)) {
    selected = String(row.cntyidfp).trim();
    if (/^72[0-9]{3}$/.test(selected)) {
      selected = selected.slice(2);
    }
  }

  if (isBlank(selected)) {
    selected = !isBlank(row.fipscty) ? row.fipscty : row.cencty;
  }

  return normalizeIntegerCode(selected, 'municipality county code');
}

function normalizeMunTitle(value) {
  var title = String(value || '').trim().replace(/\s+/g, ' ');

  if (!title) {
    return {
      ok: false,
      reason: 'municipality title is required',
      value: null
    };
  }

  return {
    ok: true,
    reason: null,
    value: title
  };
}

function directoryKey(row) {
  return {
    name: normalizeName(row['Nombre de la Institución']),
    city: normalizeTokenText(row.Pueblo),
    address: normalizeAddress([row['Dirección Física'], row['Dirección Física 2']].filter(Boolean).join(' '))
  };
}

function coordinateKey(row) {
  return {
    name: normalizeName(row.NAME),
    city: normalizeTokenText(row.CITY),
    address: normalizeAddress(row.STREET)
  };
}

function addressOverlap(left, right) {
  var leftTokens = {};
  var rightTokens = {};

  left.split(' ').filter(Boolean).forEach(function(token) {
    leftTokens[token] = true;
  });

  right.split(' ').filter(Boolean).forEach(function(token) {
    rightTokens[token] = true;
  });

  return Object.keys(leftTokens).filter(function(token) {
    return rightTokens[token];
  }).length;
}

function joinUniversityCoordinates(directoryRow, coordinateRows) {
  var key = directoryKey(directoryRow);
  var candidates = coordinateRows.filter(function(row) {
    var candidateKey = coordinateKey(row);
    return candidateKey.name === key.name && candidateKey.city === key.city;
  }).map(function(row) {
    return {
      row: row,
      score: addressOverlap(key.address, coordinateKey(row).address)
    };
  }).sort(function(left, right) {
    return right.score - left.score;
  });

  if (candidates.length === 0) {
    return {
      ok: false,
      status: 'unmatched',
      reason: 'no exact normalized name and municipality match',
      value: null
    };
  }

  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return {
      ok: false,
      status: 'ambiguous',
      reason: 'multiple coordinate rows share the same match score',
      value: null
    };
  }

  return {
    ok: true,
    status: 'matched',
    reason: null,
    value: {
      lat: Number(candidates[0].row.LAT),
      long: Number(candidates[0].row.LON),
      matchScore: candidates[0].score
    }
  };
}

module.exports = {
  normalizeAddress: normalizeAddress,
  normalizeCbpCounty: normalizeCbpCounty,
  normalizeIntegerCode: normalizeIntegerCode,
  normalizeMunCounty: normalizeMunCounty,
  normalizeMunTitle: normalizeMunTitle,
  normalizeNaics: normalizeNaics,
  normalizeName: normalizeName,
  normalizeTokenText: normalizeTokenText,
  joinUniversityCoordinates: joinUniversityCoordinates
};
