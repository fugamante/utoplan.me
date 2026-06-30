'use strict';

import fs from 'fs';
import path from 'path';

const CACHE_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'geocoding', 'unis-census-geocoder-cache.json');
const QUARANTINE_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'geocoding', 'unis-import-quarantine.json');
const BOUNDARY_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'geocoding', 'unis-import-boundary-review.json');

export interface UnisCoverage {
  sourceId: string;
  status: 'partial';
  boundaryDecision: string;
  coverageLabel: string;
  reviewedCacheRows: number;
  approvedRows: number;
  geocoderQuarantinedApprovedRows: number;
  identityQuarantinedRows: number;
  reviewedRowsAccountedFor: number;
  includedRows: number;
  excludedRows: number;
  cacheArtifactPath: string;
  quarantineArtifactPath: string;
  importBoundaryArtifactPath: string;
  limitations: string[];
}

interface RecordMap {
  [key: string]: unknown;
}

function readJson(filepath: string): RecordMap {
  return JSON.parse(fs.readFileSync(filepath, 'utf8')) as RecordMap;
}

function isRecord(value: unknown): value is RecordMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asCount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(label + ' must be a non-negative integer');
  }

  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(label + ' must be a non-empty string');
  }

  return value;
}

function readBoundaryCoverage(): UnisCoverage | null {
  const boundary = readJson(BOUNDARY_PATH);

  if (boundary.status !== 'accepted' || boundary.decision !== 'accept-partial-import') {
    return null;
  }

  if (!isRecord(boundary.currentCounts) || !isRecord(boundary.evidenceArtifacts) || !isRecord(boundary.acceptedBoundary)) {
    throw new Error('accepted unis import boundary is incomplete');
  }

  const cache = readJson(CACHE_PATH);
  const quarantine = readJson(QUARANTINE_PATH);
  const reviewedCacheRows = asCount(boundary.currentCounts.reviewedCensusCacheRows, 'reviewedCensusCacheRows');
  const approvedRows = asCount(boundary.currentCounts.reviewedAliasCampusApprovedRows, 'reviewedAliasCampusApprovedRows');
  const geocoderQuarantinedApprovedRows = asCount(boundary.currentCounts.geocoderQuarantinedApprovedRows, 'geocoderQuarantinedApprovedRows');
  const identityQuarantinedRows = asCount(boundary.currentCounts.identityQuarantinedRows, 'identityQuarantinedRows');
  const reviewedRowsAccountedFor = asCount(boundary.currentCounts.reviewedRowsAccountedFor, 'reviewedRowsAccountedFor');

  if (!Array.isArray(cache.records) || cache.records.length !== reviewedCacheRows) {
    throw new Error('accepted unis boundary cache count mismatch');
  }

  if (!Array.isArray(quarantine.records) || quarantine.records.length !== geocoderQuarantinedApprovedRows + identityQuarantinedRows) {
    throw new Error('accepted unis boundary quarantine count mismatch');
  }

  return {
    sourceId: asString(boundary.sourceId, 'sourceId'),
    status: 'partial',
    boundaryDecision: 'accept-partial-import',
    coverageLabel: asString(boundary.acceptedBoundary.coverageLabel, 'acceptedBoundary.coverageLabel'),
    reviewedCacheRows,
    approvedRows,
    geocoderQuarantinedApprovedRows,
    identityQuarantinedRows,
    reviewedRowsAccountedFor,
    includedRows: reviewedCacheRows,
    excludedRows: geocoderQuarantinedApprovedRows + identityQuarantinedRows,
    cacheArtifactPath: asString(boundary.evidenceArtifacts.cacheArtifactPath, 'cacheArtifactPath'),
    quarantineArtifactPath: asString(boundary.evidenceArtifacts.quarantineArtifactPath, 'quarantineArtifactPath'),
    importBoundaryArtifactPath: 'data/geocoding/unis-import-boundary-review.json',
    limitations: [
      asString(boundary.acceptedBoundary.apiCoverageLanguage, 'acceptedBoundary.apiCoverageLanguage'),
      asString(boundary.acceptedBoundary.exclusionLanguage, 'acceptedBoundary.exclusionLanguage')
    ]
  };
}

export function collectionCoverage(kind: string): UnisCoverage | null {
  if (kind !== 'unis') {
    return null;
  }

  return readBoundaryCoverage();
}
