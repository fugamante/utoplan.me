'use strict';

import type {AnonymousProfileData} from './anonymous_profile';

export const MAX_PROFILE_BODY_BYTES = 2048;
export const MAX_BUSINESS_IDEA_LENGTH = 160;
export const ALLOWED_PROFILE_FIELDS = [
  'businessIdea',
  'selectedMunicipalityId',
  'selectedCategoryId'
];

export interface ProfileValidationResult {
  ok: boolean;
  statusCode: 200 | 400 | 413 | 422;
  error: string | null;
  profile: AnonymousProfileData | null;
}

export interface ProfileEnvelopeValidationResult extends ProfileValidationResult {
  rowVersion: number | null;
}

function byteLength(body: string): number {
  return Buffer.byteLength(body, 'utf8');
}

function invalid(statusCode: 400 | 413 | 422, error: string): ProfileValidationResult {
  return {
    ok: false,
    statusCode: statusCode,
    error: error,
    profile: null
  };
}

function valid(profile: AnonymousProfileData): ProfileValidationResult {
  return {
    ok: true,
    statusCode: 200,
    error: null,
    profile: profile
  };
}

export function validateProfileObject(value: unknown): ProfileValidationResult {
  const profile = value as Record<string, unknown>;
  const output: AnonymousProfileData = {};

  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return invalid(422, 'invalid_profile');
  }

  const unknownField = Object.keys(profile).filter(function(key) {
    return ALLOWED_PROFILE_FIELDS.indexOf(key) === -1;
  })[0];

  if (unknownField) {
    return invalid(422, 'invalid_profile');
  }

  if (profile.businessIdea !== undefined) {
    if (typeof profile.businessIdea !== 'string' || profile.businessIdea.length > MAX_BUSINESS_IDEA_LENGTH) {
      return invalid(422, 'invalid_profile');
    }

    output.businessIdea = profile.businessIdea;
  }

  if (profile.selectedMunicipalityId !== undefined) {
    if (!Number.isInteger(profile.selectedMunicipalityId) || Number(profile.selectedMunicipalityId) <= 0) {
      return invalid(422, 'invalid_profile');
    }

    output.selectedMunicipalityId = Number(profile.selectedMunicipalityId);
  }

  if (profile.selectedCategoryId !== undefined) {
    if (
      typeof profile.selectedCategoryId !== 'string' ||
      !/^[a-z][a-z0-9_]{1,63}$/.test(profile.selectedCategoryId)
    ) {
      return invalid(422, 'invalid_profile');
    }

    output.selectedCategoryId = profile.selectedCategoryId;
  }

  return valid(output);
}

function validateTopLevelKeys(value: Record<string, unknown>, allowedKeys: string[]): ProfileValidationResult | null {
  const unknownField = Object.keys(value).filter(function(key) {
    return allowedKeys.indexOf(key) === -1;
  })[0];

  if (unknownField) {
    return invalid(422, 'invalid_profile');
  }

  return null;
}

export function validateProfileBody(body: string): ProfileValidationResult {
  let parsed: unknown;

  if (byteLength(body) > MAX_PROFILE_BODY_BYTES) {
    return invalid(413, 'profile_too_large');
  }

  try {
    parsed = body ? JSON.parse(body) : {};
  } catch (error) {
    return invalid(400, 'invalid_request');
  }

  return validateProfileObject(parsed);
}

export function validateAnonymousSessionCreateBody(body: string): ProfileValidationResult {
  let parsed: Record<string, unknown>;

  if (byteLength(body) > MAX_PROFILE_BODY_BYTES) {
    return invalid(413, 'profile_too_large');
  }

  try {
    parsed = body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch (error) {
    return invalid(400, 'invalid_request');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalid(422, 'invalid_profile');
  }

  const topLevelError = validateTopLevelKeys(parsed, ['profile']);

  if (topLevelError) {
    return topLevelError;
  }

  if (parsed.profile === undefined) {
    return valid({});
  }

  return validateProfileObject(parsed.profile);
}

export function validateProfileEnvelopeBody(body: string, requireRowVersion: boolean): ProfileEnvelopeValidationResult {
  let parsed: Record<string, unknown>;
  const emptyResult = invalid(422, 'invalid_profile') as ProfileEnvelopeValidationResult;

  emptyResult.rowVersion = null;

  if (byteLength(body) > MAX_PROFILE_BODY_BYTES) {
    return Object.assign(invalid(413, 'profile_too_large'), {
      rowVersion: null
    });
  }

  try {
    parsed = body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch (error) {
    return Object.assign(invalid(400, 'invalid_request'), {
      rowVersion: null
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emptyResult;
  }

  const topLevelError = validateTopLevelKeys(parsed, requireRowVersion ? ['rowVersion', 'profile'] : ['profile']);

  if (topLevelError) {
    return Object.assign(topLevelError, {
      rowVersion: null
    });
  }

  if (requireRowVersion && (!Number.isInteger(parsed.rowVersion) || Number(parsed.rowVersion) <= 0)) {
    return emptyResult;
  }

  if (!parsed.profile || typeof parsed.profile !== 'object' || Array.isArray(parsed.profile)) {
    return emptyResult;
  }

  const profileResult = validateProfileObject(parsed.profile);

  return Object.assign(profileResult, {
    rowVersion: parsed.rowVersion === undefined ? null : Number(parsed.rowVersion)
  });
}

export function validateAnonymousProfilePutBody(body: string): ProfileEnvelopeValidationResult {
  return validateProfileEnvelopeBody(body, true);
}
