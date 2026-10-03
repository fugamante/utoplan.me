'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var matchPath = path.join(root, 'data', 'unis', 'ipeds-alias-campus-review.json');
var quarantinePath = path.join(root, 'data', 'geocoding', 'unis-import-quarantine.json');
var boundaryPath = path.join(root, 'data', 'geocoding', 'unis-import-boundary-review.json');
var generatedPath = path.join(root, 'data', 'generated', 'unis-partial-import.json');
var orlieReviewPath = path.join(root, 'data', 'unis', 'orlie-jip-row-review.json');
var outputPath = path.join(root, 'data', 'unis', 'identity-review.json');

var reviewedAuthorityEvidence = {
  'Universidad Ana G. Méndez': {
    classification: 'nces-dapip-orlie-campus-corroborated-not-import-ready',
    identityStatus: 'identity-corroborated-not-import-ready',
    corroborationStatus: 'nces-dapip-orlie-row-reviewed',
    evidenceSummary: 'NCES College Navigator lists Universidad Ana G. Mendez-Cupey Campus in San Juan, Puerto Rico. DAPIP lists Universidad Ana G. Mendez - Cupey Campus in Puerto Rico with active institutional accreditation. ORLIE/JIP lists Universidad Ana G. Méndez in the postsecondary listing. These corroborate a campus-level identity candidate, but do not resolve alias/campus, address, or Census-cache gates.',
    authorityEvidenceReviewed: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        sourceName: 'NCES College Navigator',
        sourceUrl: 'https://nces.ed.gov/collegenavigator/?id=241739',
        retrievedAt: '2026-06-26',
        evidenceRole: 'identity-campus-corroboration',
        matchedName: 'Universidad Ana G. Mendez-Cupey Campus',
        matchedPlace: 'San Juan, Puerto Rico 00928',
        notes: 'Corroborates a Puerto Rico campus identity candidate only; not a direct row source or coordinate authority.'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        sourceName: 'U.S. Department of Education DAPIP',
        sourceUrl: 'https://ope.ed.gov/dapip/#/institution-profile/150969',
        apiInstitutionUrl: 'https://ope.ed.gov/dapip/api/institutions/150969',
        apiAccreditationUrl: 'https://ope.ed.gov/dapip/api/records/institutional/profile/150969',
        retrievedAt: '2026-06-26',
        evidenceRole: 'accreditation-corroboration',
        dapipUnitId: 150969,
        opeId: '02587500',
        matchedName: 'Universidad Ana G. Mendez - Cupey Campus',
        matchedPlace: 'Cupey, Puerto Rico',
        activeStatus: 'Active',
        accreditingAgency: 'Middle States Commission on Higher Education',
        accreditationStatus: 'Active',
        reviewDate: '01/01/2031',
        notes: 'Corroborates an active Puerto Rico institution/campus accreditation record only; not a direct row source or coordinate authority.'
      }
    ]
  },
  'Universidad Carlos Albizu': {
    classification: 'nces-dapip-orlie-alias-corroborated-not-import-ready',
    identityStatus: 'identity-corroborated-not-import-ready',
    corroborationStatus: 'nces-dapip-orlie-row-reviewed',
    evidenceSummary: 'NCES College Navigator lists Albizu University-San Juan in San Juan, Puerto Rico. DAPIP lists Albizu University in San Juan, Puerto Rico with active institutional accreditation. ORLIE/JIP lists Universidad Albizu in San Juan. These corroborate an alias identity candidate, but do not resolve alias/campus, address, or Census-cache gates.',
    authorityEvidenceReviewed: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        sourceName: 'NCES College Navigator',
        sourceUrl: 'https://nces.ed.gov/collegenavigator/?id=241331',
        retrievedAt: '2026-06-26',
        evidenceRole: 'identity-alias-corroboration',
        matchedName: 'Albizu University-San Juan',
        matchedPlace: 'San Juan, Puerto Rico 00902-3711',
        notes: 'Corroborates a Puerto Rico institution alias candidate only; not a direct row source or coordinate authority.'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        sourceName: 'U.S. Department of Education DAPIP',
        sourceUrl: 'https://ope.ed.gov/dapip/#/institution-profile/150871',
        apiInstitutionUrl: 'https://ope.ed.gov/dapip/api/institutions/150871',
        apiAccreditationUrl: 'https://ope.ed.gov/dapip/api/records/institutional/profile/150871',
        retrievedAt: '2026-06-26',
        evidenceRole: 'accreditation-corroboration',
        dapipUnitId: 150871,
        opeId: '01072400',
        matchedName: 'Albizu University',
        matchedPlace: 'San Juan, Puerto Rico',
        activeStatus: 'Active',
        accreditingAgency: 'Middle States Commission on Higher Education',
        accreditationStatus: 'Active',
        reviewDate: '01/01/2028',
        notes: 'Corroborates an active Puerto Rico institution accreditation record only; not a direct row source or coordinate authority.'
      }
    ]
  },
  'Universidad de Puerto Rico': {
    classification: 'nces-dapip-orlie-campus-corroborated-not-import-ready',
    identityStatus: 'identity-corroborated-not-import-ready',
    corroborationStatus: 'nces-dapip-orlie-row-reviewed',
    evidenceSummary: 'NCES College Navigator lists University of Puerto Rico-Rio Piedras in San Juan, Puerto Rico. DAPIP lists University of Puerto Rico - Rio Piedras Campus in San Juan, Puerto Rico with active institutional accreditation. ORLIE/JIP lists Universidad de Puerto Rico in San Juan. These corroborate a campus-level identity candidate for the generic directory title, but do not resolve alias/campus, address, or Census-cache gates.',
    authorityEvidenceReviewed: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        sourceName: 'NCES College Navigator',
        sourceUrl: 'https://nces.ed.gov/collegenavigator/?id=243221',
        retrievedAt: '2026-06-26',
        evidenceRole: 'identity-campus-corroboration',
        matchedName: 'University of Puerto Rico-Rio Piedras',
        matchedPlace: 'San Juan, Puerto Rico 00931-0000',
        notes: 'Corroborates a Puerto Rico campus identity candidate only; the directory title remains too broad for direct import.'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        sourceName: 'U.S. Department of Education DAPIP',
        sourceUrl: 'https://ope.ed.gov/dapip/#/institution-profile/151485',
        apiInstitutionUrl: 'https://ope.ed.gov/dapip/api/institutions/151485',
        apiAccreditationUrl: 'https://ope.ed.gov/dapip/api/records/institutional/profile/151485',
        retrievedAt: '2026-06-26',
        evidenceRole: 'accreditation-corroboration',
        dapipUnitId: 151485,
        opeId: '00710800',
        matchedName: 'University of Puerto Rico - Rio Piedras Campus',
        matchedPlace: 'San Juan, Puerto Rico',
        activeStatus: 'Active',
        accreditingAgency: 'Middle States Commission on Higher Education',
        accreditationStatus: 'Active',
        reviewDate: '01/01/2033',
        notes: 'Corroborates an active Puerto Rico campus accreditation record only; the directory title remains too broad for direct import.'
      }
    ]
  },
  'Universidad del Sagrado Corazón': {
    classification: 'nces-dapip-orlie-identity-corroborated-not-import-ready',
    identityStatus: 'identity-corroborated-not-import-ready',
    corroborationStatus: 'nces-dapip-orlie-row-reviewed',
    evidenceSummary: 'NCES College Navigator lists Universidad del Sagrado Corazon in Santurce, Puerto Rico. DAPIP lists University of the Sacred Heart in San Juan, Puerto Rico with the Spanish alias Universidad del Sagrado Corazon and active institutional accreditation. ORLIE/JIP lists Universidad del Sagrado Corazón in San Juan. These corroborate an identity candidate, but do not resolve address or Census-cache gates.',
    authorityEvidenceReviewed: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        sourceName: 'NCES College Navigator',
        sourceUrl: 'https://nces.ed.gov/collegenavigator/?id=243443',
        retrievedAt: '2026-06-26',
        evidenceRole: 'identity-corroboration',
        matchedName: 'Universidad del Sagrado Corazon',
        matchedPlace: 'Santurce, Puerto Rico 00907',
        notes: 'Corroborates a Puerto Rico institution identity candidate only; not a direct row source or coordinate authority.'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        sourceName: 'U.S. Department of Education DAPIP',
        sourceUrl: 'https://ope.ed.gov/dapip/#/institution-profile/151537',
        apiInstitutionUrl: 'https://ope.ed.gov/dapip/api/institutions/151537',
        apiAccreditationUrl: 'https://ope.ed.gov/dapip/api/records/institutional/profile/151537',
        retrievedAt: '2026-06-26',
        evidenceRole: 'accreditation-corroboration',
        dapipUnitId: 151537,
        opeId: '00393700',
        matchedName: 'University of the Sacred Heart',
        matchedAlias: 'Universidad del Sagrado Corazon',
        matchedPlace: 'San Juan, Puerto Rico',
        activeStatus: 'Active',
        accreditingAgency: 'Middle States Commission on Higher Education',
        accreditationStatus: 'Active',
        reviewDate: '01/01/2027',
        notes: 'Corroborates an active Puerto Rico institution accreditation record and Spanish alias only; not a direct row source or coordinate authority.'
      }
    ]
  },
  'Universidad Interamericana de PR': {
    classification: 'nces-dapip-orlie-campus-corroborated-not-import-ready',
    identityStatus: 'identity-corroborated-not-import-ready',
    corroborationStatus: 'nces-dapip-orlie-row-reviewed',
    evidenceSummary: 'NCES College Navigator lists Inter American University of Puerto Rico-Metro in San Juan, Puerto Rico. DAPIP lists Inter American University of Puerto Rico Metropolitan Campus in San Juan, Puerto Rico with active institutional accreditation. ORLIE/JIP lists Universidad Interamericana de Puerto Rico in San Juan. These corroborate a campus-level identity candidate, but do not resolve alias/campus, address, or Census-cache gates.',
    authorityEvidenceReviewed: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        sourceName: 'NCES College Navigator',
        sourceUrl: 'https://nces.ed.gov/collegenavigator/?id=242653',
        retrievedAt: '2026-06-26',
        evidenceRole: 'identity-campus-corroboration',
        matchedName: 'Inter American University of Puerto Rico-Metro',
        matchedPlace: 'San Juan, Puerto Rico 00919',
        notes: 'Corroborates a Puerto Rico campus identity candidate only; not a direct row source or coordinate authority.'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        sourceName: 'U.S. Department of Education DAPIP',
        sourceUrl: 'https://ope.ed.gov/dapip/#/institution-profile/151193',
        apiInstitutionUrl: 'https://ope.ed.gov/dapip/api/institutions/151193',
        apiAccreditationUrl: 'https://ope.ed.gov/dapip/api/records/institutional/profile/151193',
        retrievedAt: '2026-06-26',
        evidenceRole: 'accreditation-corroboration',
        dapipUnitId: 151193,
        opeId: '00394000',
        matchedName: 'Inter American University of Puerto Rico Metropolitan Campus',
        matchedPlace: 'San Juan, Puerto Rico',
        activeStatus: 'Active',
        accreditingAgency: 'Middle States Commission on Higher Education',
        accreditationStatus: 'Active',
        reviewDate: '01/01/2031',
        notes: 'Corroborates an active Puerto Rico campus accreditation record only; not a direct row source or coordinate authority.'
      }
    ]
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function key(record) {
  return record.directoryInstitution + '|' + record.directoryMunicipality + '|' + record.directoryAddress;
}

function normalizedKey(record) {
  return record.directoryInstitution + '|' + record.directoryMunicipality;
}

function isIdentityQuarantine(record) {
  return record.exclusionReason.indexOf('No reviewed auxiliary IPEDS alias/campus match') !== -1 ||
    record.exclusionReason.indexOf('No exact source-backed institution identity match') !== -1;
}

function reviewedAuthorityEvidenceItems(reviewedEvidence, orlieEvidence) {
  if (!reviewedEvidence) {
    return [];
  }
  var evidence = reviewedEvidence.authorityEvidenceReviewed.slice();
  if (orlieEvidence) {
    evidence.push({
      sourceId: 'prdos-orlie-jip-postsecondary-listing',
      sourceName: 'Puerto Rico Department of State ORLIE/JIP postsecondary listing',
      sourceUrl: 'https://www.estado.pr.gov/instituciones-educativas',
      reportUrl: 'https://app.powerbigov.us/view?r=eyJrIjoiMjM5M2U5NTItYWU0My00MDFjLTljMDMtZmJhZTlmZjIwYjVmIiwidCI6IjYzNmFkYzFhLTkyOTEtNGJlOC1hYjFiLTgzMDc2NWMzYjc0ZCJ9',
      reviewArtifactPath: 'data/unis/orlie-jip-row-review.json',
      retrievedAt: '2026-06-26',
      evidenceRole: orlieEvidence.evidenceRole,
      matchedName: orlieEvidence.matchedName,
      matchedPlace: [orlieEvidence.physicalAddress1, orlieEvidence.physicalAddress2, orlieEvidence.physicalCity, 'Puerto Rico']
        .filter(Boolean)
        .join(', '),
      institutionType: orlieEvidence.institutionType,
      publicPrivate: orlieEvidence.publicPrivate,
      profitType: orlieEvidence.profitType,
      licenseExpiration: orlieEvidence.licenseExpiration,
      matchType: orlieEvidence.matchType,
      notes: orlieEvidence.notes
    });
  }
  return evidence;
}

function remainingAuthoritySources(evidenceItems) {
  var required = [
    'nces-college-navigator-puerto-rico',
    'usdoe-dapip-puerto-rico',
    'prdos-orlie-jip-postsecondary-listing'
  ];
  if (!evidenceItems || evidenceItems.length === 0) {
    return required;
  }
  var reviewed = evidenceItems.reduce(function(index, evidence) {
    index[evidence.sourceId] = true;
    return index;
  }, {});
  return required.filter(function(sourceId) {
    return !reviewed[sourceId];
  });
}

function main() {
  var matchReview = readJson(matchPath);
  var quarantine = readJson(quarantinePath);
  var boundary = readJson(boundaryPath);
  var generated = readJson(generatedPath);
  var orlieReview = readJson(orlieReviewPath);
  var orlieByInstitution = orlieReview.records.reduce(function(index, record) {
    index[record.directoryInstitution] = record;
    return index;
  }, {});
  var generatedNames = generated.rows.reduce(function(index, record) {
    index[record.title] = true;
    return index;
  }, {});
  var quarantineByName = quarantine.records.reduce(function(index, record) {
    if (isIdentityQuarantine(record)) {
      index[record.directoryInstitution] = record;
    }
    return index;
  }, {});

  assert(matchReview.status === 'reviewed', 'identity review requires reviewed alias/campus artifact');
  assert(boundary.status === 'accepted', 'identity review expects accepted partial import boundary');
  assert(boundary.currentCounts.identityQuarantinedRows === matchReview.quarantinedRows.length, 'boundary identity count must match alias/campus quarantine rows');
  assert(matchReview.quarantinedRows.length === 27, 'expected 27 identity-quarantined rows');
  assert(orlieReview.status === 'row-level-query-reviewed', 'ORLIE/JIP row review must be query reviewed');
  assert(orlieReview.summary.matchedRows === 5, 'ORLIE/JIP row review must include five matched rows');
  assert(orlieReview.summary.importEligibleRows === 0, 'ORLIE/JIP review must not create import eligibility');
  assert(orlieReview.summary.coordinateEligibleRows === 0, 'ORLIE/JIP review must not create coordinate eligibility');
  assert(orlieReview.summary.generatedOutputEligibleRows === 0, 'ORLIE/JIP review must not create generated output eligibility');

  var records = matchReview.quarantinedRows.map(function(record) {
    var quarantineRecord = quarantineByName[record.directoryInstitution];
    var reviewedEvidence = reviewedAuthorityEvidence[record.directoryInstitution];
    var orlieEvidence = orlieByInstitution[record.directoryInstitution];
    var authorityEvidenceItems = reviewedAuthorityEvidenceItems(reviewedEvidence, orlieEvidence);
    assert(quarantineRecord, 'missing identity quarantine record: ' + record.directoryInstitution);
    assert(!generatedNames[record.directoryInstitution], 'identity-quarantined row must not be generated: ' + record.directoryInstitution);
    if (orlieEvidence) {
      assert(reviewedEvidence, 'ORLIE/JIP evidence may only attach to rows with NCES+DAPIP review: ' + record.directoryInstitution);
    }

    return {
      directoryInstitution: record.directoryInstitution,
      directoryMunicipality: record.directoryMunicipality,
      directoryAddress: record.directoryAddress,
      normalizedAddress: quarantineRecord.normalizedAddress,
      matchReviewKey: key(record),
      normalizedIdentityKey: normalizedKey(record),
      matchReviewReason: record.quarantineReason,
      quarantineExclusionReason: quarantineRecord.exclusionReason,
      classification: reviewedEvidence ? reviewedEvidence.classification : 'identity-authority-review-required',
      identityStatus: reviewedEvidence ? reviewedEvidence.identityStatus : 'not-import-ready',
      corroborationStatus: reviewedEvidence ? reviewedEvidence.corroborationStatus : 'not-row-reviewed',
      importEligible: false,
      coordinateEligible: false,
      generatedOutputEligible: false,
      authorityEvidenceReviewed: authorityEvidenceItems,
      requiredAuthoritySources: [
        'nces-college-navigator-puerto-rico',
        'usdoe-dapip-puerto-rico',
        'prdos-orlie-jip-postsecondary-listing'
      ],
      remainingAuthoritySources: remainingAuthoritySources(authorityEvidenceItems),
      requiredPromotionEvidence: [
        'row-level identity corroboration from registered authority sources',
        'accepted alias/campus review decision',
        'reviewed public-address evidence',
        'reviewed Puerto Rico Census geocoder cache match'
      ],
      evidenceSummary: reviewedEvidence ? reviewedEvidence.evidenceSummary : 'No row-level authority evidence has been reviewed for this identity-quarantined row.',
      directImportBlocker: 'No accepted row-level identity authority decision exists for this row; corroboration sources may inform review but do not replace the primary row source or provide coordinate authority.',
      reviewedAt: record.reviewedAt,
      reviewer: record.reviewer
    };
  });
  var authorityReviewedRows = records.filter(function(record) {
    return record.authorityEvidenceReviewed.length > 0;
  }).length;
  var dapipReviewedRows = records.filter(function(record) {
    return record.authorityEvidenceReviewed.some(function(evidence) {
      return evidence.sourceId === 'usdoe-dapip-puerto-rico';
    });
  }).length;
  var orlieReviewedRows = records.filter(function(record) {
    return record.authorityEvidenceReviewed.some(function(evidence) {
      return evidence.sourceId === 'prdos-orlie-jip-postsecondary-listing';
    });
  }).length;
  var rowsStillMissingOrlieJipCorroboration = records.length - orlieReviewedRows;

  var artifact = {
    schemaVersion: 1,
    sourceId: matchReview.sourceId,
    generatedAt: '2026-06-26',
    buildCommand: 'node scripts/verify_unis_identity.js',
    status: 'reviewed-excluded',
    decision: 'retain-identity-quarantine',
    decisionSummary: 'All 27 identity-quarantined rows remain excluded from generated/imported unis output. Five rows now have narrow NCES, DAPIP, and ORLIE/JIP corroboration, while 22 rows still lack row-level authority corroboration. No row has the full alias/campus, public-address, and Census-cache chain required to change import readiness.',
    productBoundary: 'descriptive-only',
    matchReviewArtifactPath: 'data/unis/ipeds-alias-campus-review.json',
    quarantineArtifactPath: 'data/geocoding/unis-import-quarantine.json',
    importBoundaryArtifactPath: 'data/geocoding/unis-import-boundary-review.json',
    generatedArtifactPath: 'data/generated/unis-partial-import.json',
    authoritySources: [
      {
        sourceId: 'nces-college-navigator-puerto-rico',
        role: 'identity-corroboration-only'
      },
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        role: 'accreditation-corroboration-only'
      },
      {
        sourceId: 'prdos-orlie-jip-postsecondary-listing',
        role: 'licensure-corroboration-only'
      }
    ],
    summary: {
      identityQuarantinedRows: records.length,
      authorityReviewedRows: authorityReviewedRows,
      identityCorroboratedRows: authorityReviewedRows,
      dapipReviewedRows: dapipReviewedRows,
      orlieReviewedRows: orlieReviewedRows,
      identityPromotedRows: 0,
      directImportEligibleRows: 0,
      coordinateEligibleRows: 0,
      generatedOutputEligibleRows: 0,
      rowsMissingExactAliasCampusEvidence: records.length,
      rowsWithoutRowLevelAuthorityCorroboration: records.length - authorityReviewedRows,
      rowsStillMissingOrlieJipCorroboration: rowsStillMissingOrlieJipCorroboration
    },
    invariants: [
      'Identity corroboration sources do not replace the primary Datos.PR row source.',
      'Identity classification alone does not provide coordinate authority.',
      'NCES, DAPIP, and ORLIE/JIP corroboration do not provide public-address corrections or Census geocoder cache matches.',
      'Identity-quarantined rows must remain absent from generated/imported unis output.',
      'A row needs accepted alias/campus, public-address, and Census-cache evidence before generated output eligibility can change.'
    ],
    authoritySourceReviewNotes: [
      {
        sourceId: 'usdoe-dapip-puerto-rico',
        status: 'row-level-corroboration-recorded-for-nces-subset',
        reviewedRows: dapipReviewedRows,
        notes: 'DAPIP simple search, institution profile, and institutional accreditation API records were reviewed only for the five NCES-corroborated rows.'
      },
      {
        sourceId: 'prdos-orlie-jip-postsecondary-listing',
        status: 'row-level-corroboration-recorded-for-nces-dapip-subset',
        reviewedRows: orlieReviewedRows,
        sourceUrl: 'https://www.estado.pr.gov/instituciones-educativas',
        listingUrl: 'https://app.powerbigov.us/view?r=eyJrIjoiMjM5M2U5NTItYWU0My00MDFjLTljMDMtZmJhZTlmZjIwYjVmIiwidCI6IjYzNmFkYzFhLTkyOTEtNGJlOC1hYjFiLTgzMDc2NWMzYjc0ZCJ9',
        reviewArtifactPath: 'data/unis/orlie-jip-row-review.json',
        notes: 'The ORLIE/JIP page identifies the office and links a public Power BI listing for postsecondary institutions. The checked-in ORLIE/JIP row review records the bounded public query contract and five row-level licensure-listing matches without storing personal contact fields.'
      }
    ],
    records: records
  };

  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + '\n');
  process.stdout.write('wrote unis identity review to ' + outputPath + '\n');
}

main();
