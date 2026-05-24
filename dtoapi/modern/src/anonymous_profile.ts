'use strict';

import * as db from './db';
import type {DatabaseRow} from './resource_contract';

export const PROFILE_SCHEMA_VERSION = 1;

export interface AnonymousProfileData {
  businessIdea?: string;
  selectedMunicipalityId?: number;
  selectedCategoryId?: string;
}

export interface AnonymousSessionRow {
  id: number;
  publicId: string;
  tokenHash: Buffer;
  csrfTokenHash: Buffer;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface AnonymousProfileRow {
  id: number;
  anonymousSessionId: number;
  schemaVersion: number;
  rowVersion: number;
  profile: AnonymousProfileData;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletionRequestedAt: string | null;
  exportRequestedAt: string | null;
}

export interface AnonymousProfileEnvelope {
  schemaVersion: number;
  rowVersion: number;
  updatedAt: string;
  data: AnonymousProfileData;
}

export interface AnonymousProfileEventInput {
  anonymousSessionId: number;
  anonymousProfileId: number | null;
  eventName: string;
  metadata: Record<string, unknown>;
}

export interface CreateAnonymousSessionInput {
  publicId: string;
  tokenHash: Buffer;
  csrfTokenHash: Buffer;
  expiresAt: Date;
  profile: AnonymousProfileData;
}

export interface UpdateProfileInput {
  anonymousSessionId: number;
  expectedRowVersion: number;
  profile: AnonymousProfileData;
}

export interface DeleteProfileInput {
  anonymousSessionId: number;
  revokeReason?: string;
}

export interface CreatedAnonymousSession {
  session: AnonymousSessionRow;
  profile: AnonymousProfileRow;
}

export interface DeletedAnonymousProfile {
  profile: AnonymousProfileRow;
  session: AnonymousSessionRow | null;
}

export type AnonymousSessionCallback = (error: Error | null, row: AnonymousSessionRow | null) => void;
export type AnonymousProfileCallback = (error: Error | null, row: AnonymousProfileRow | null) => void;
export type CreatedAnonymousSessionCallback = (error: Error | null, result: CreatedAnonymousSession | null) => void;
export type DeletedAnonymousProfileCallback = (error: Error | null, result: DeletedAnonymousProfile | null) => void;

export function insertAnonymousSessionQuery(): string {
  return [
    'INSERT INTO anonymous_sessions (public_id, token_hash, csrf_token_hash, expires_at)',
    'VALUES ($1, $2, $3, $4)',
    'RETURNING id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason'
  ].join(' ');
}

export function insertAnonymousProfileQuery(): string {
  return [
    'INSERT INTO anonymous_planning_profiles (anonymous_session_id, schema_version, row_version, profile)',
    'VALUES ($1, $2, 1, $3)',
    'RETURNING id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at'
  ].join(' ');
}

export function selectActiveSessionByTokenHashQuery(): string {
  return [
    'SELECT id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason',
    'FROM anonymous_sessions',
    'WHERE token_hash = $1',
    'AND revoked_at IS NULL',
    'AND expires_at > NOW()',
    'LIMIT 1'
  ].join(' ');
}

export function touchAnonymousSessionQuery(): string {
  return [
    'UPDATE anonymous_sessions',
    'SET last_seen_at = NOW()',
    'WHERE id = $1',
    'AND revoked_at IS NULL',
    'AND expires_at > NOW()',
    'RETURNING id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason'
  ].join(' ');
}

export function selectActiveProfileBySessionIdQuery(): string {
  return [
    'SELECT id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at',
    'FROM anonymous_planning_profiles',
    'WHERE anonymous_session_id = $1',
    'AND deleted_at IS NULL',
    'LIMIT 1'
  ].join(' ');
}

export function selectProfileStateBySessionIdQuery(): string {
  return [
    'SELECT id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at',
    'FROM anonymous_planning_profiles',
    'WHERE anonymous_session_id = $1',
    'LIMIT 1'
  ].join(' ');
}

export function updateOwnedProfileQuery(): string {
  return [
    'UPDATE anonymous_planning_profiles',
    'SET profile = $2, row_version = row_version + 1, updated_at = NOW()',
    'WHERE anonymous_session_id = $1',
    'AND row_version = $3',
    'AND deleted_at IS NULL',
    'RETURNING id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at'
  ].join(' ');
}

export function softDeleteOwnedProfileQuery(): string {
  return [
    'UPDATE anonymous_planning_profiles',
    'SET deleted_at = NOW(), deletion_requested_at = NOW(), updated_at = NOW()',
    'WHERE anonymous_session_id = $1',
    'AND deleted_at IS NULL',
    'RETURNING id, anonymous_session_id, schema_version, row_version, profile, created_at, updated_at, deleted_at, deletion_requested_at, export_requested_at'
  ].join(' ');
}

export function revokeAnonymousSessionQuery(): string {
  return [
    'UPDATE anonymous_sessions',
    'SET revoked_at = NOW(), rotated_at = NOW(), revoke_reason = $2',
    'WHERE id = $1',
    'AND revoked_at IS NULL',
    'RETURNING id, public_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at, revoked_at, revoke_reason'
  ].join(' ');
}

export function insertAnonymousProfileEventQuery(): string {
  return [
    'INSERT INTO anonymous_profile_events (anonymous_session_id, anonymous_profile_id, event_name, metadata)',
    'VALUES ($1, $2, $3, $4)',
    'RETURNING id'
  ].join(' ');
}

function parseProfile(profile: unknown): AnonymousProfileData {
  if (!profile) {
    return {};
  }

  if (typeof profile === 'string') {
    return JSON.parse(profile) as AnonymousProfileData;
  }

  return profile as AnonymousProfileData;
}

export function sessionRow(row: DatabaseRow): AnonymousSessionRow {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    tokenHash: row.token_hash as Buffer,
    csrfTokenHash: row.csrf_token_hash as Buffer,
    createdAt: String(row.created_at),
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    expiresAt: String(row.expires_at),
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    revokeReason: row.revoke_reason ? String(row.revoke_reason) : null
  };
}

export function profileRow(row: DatabaseRow): AnonymousProfileRow {
  return {
    id: Number(row.id),
    anonymousSessionId: Number(row.anonymous_session_id),
    schemaVersion: Number(row.schema_version),
    rowVersion: Number(row.row_version),
    profile: parseProfile(row.profile),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    deletionRequestedAt: row.deletion_requested_at ? String(row.deletion_requested_at) : null,
    exportRequestedAt: row.export_requested_at ? String(row.export_requested_at) : null
  };
}

export function profileEnvelope(row: AnonymousProfileRow): AnonymousProfileEnvelope {
  return {
    schemaVersion: row.schemaVersion,
    rowVersion: row.rowVersion,
    updatedAt: row.updatedAt,
    data: row.profile
  };
}

export function createAnonymousSession(input: CreateAnonymousSessionInput, callback: AnonymousProfileCallback): void {
  let created: CreatedAnonymousSession | null = null;

  db.transaction(function(client, done) {
    createAnonymousSessionWithExecutor(client, input, function(error, result) {
      if (error) {
        done(error);
        return;
      }

      created = result;
      done();
    });
  }, function(error) {
    callback(error || null, error ? null : (created ? created.profile : null));
  });
}

export function createAnonymousSessionWithExecutor(executor: db.QueryExecutor, input: CreateAnonymousSessionInput, callback: CreatedAnonymousSessionCallback): void {
  executor.query(insertAnonymousSessionQuery(), [
    input.publicId,
    input.tokenHash,
    input.csrfTokenHash,
    input.expiresAt
  ], function(sessionError, sessionResult) {
    if (sessionError) {
      callback(sessionError, null);
      return;
    }

    if (!sessionResult.rows[0]) {
      callback(new Error('anonymous session insert returned no row'), null);
      return;
    }

    const session = sessionRow(sessionResult.rows[0]);

    executor.query(insertAnonymousProfileQuery(), [
      session.id,
      PROFILE_SCHEMA_VERSION,
      input.profile
    ], function(profileError, profileResult) {
      if (profileError) {
        callback(profileError, null);
        return;
      }

      if (!profileResult.rows[0]) {
        callback(new Error('anonymous profile insert returned no row'), null);
        return;
      }

      callback(null, {
        session: session,
        profile: profileRow(profileResult.rows[0])
      });
    });
  });
}

export function findActiveSessionByTokenHash(tokenHash: Buffer, callback: AnonymousSessionCallback): void {
  db.query(selectActiveSessionByTokenHashQuery(), [tokenHash], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    callback(null, result.rows[0] ? sessionRow(result.rows[0]) : null);
  });
}

export function findOwnedProfile(anonymousSessionId: number, callback: AnonymousProfileCallback): void {
  db.query(selectActiveProfileBySessionIdQuery(), [anonymousSessionId], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    callback(null, result.rows[0] ? profileRow(result.rows[0]) : null);
  });
}

export function updateOwnedProfile(input: UpdateProfileInput, callback: AnonymousProfileCallback): void {
  db.query(updateOwnedProfileQuery(), [
    input.anonymousSessionId,
    input.profile,
    input.expectedRowVersion
  ], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    callback(null, result.rows[0] ? profileRow(result.rows[0]) : null);
  });
}

export function softDeleteOwnedProfile(input: DeleteProfileInput, callback: AnonymousProfileCallback): void {
  db.query(softDeleteOwnedProfileQuery(), [input.anonymousSessionId], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    callback(null, result.rows[0] ? profileRow(result.rows[0]) : null);
  });
}

export function deleteOwnedProfileAndRevokeWithExecutor(executor: db.QueryExecutor, input: DeleteProfileInput, callback: DeletedAnonymousProfileCallback): void {
  executor.query(softDeleteOwnedProfileQuery(), [input.anonymousSessionId], function(deleteError, deleteResult) {
    if (deleteError) {
      callback(deleteError, null);
      return;
    }

    if (!deleteResult.rows[0]) {
      callback(null, null);
      return;
    }

    const profile = profileRow(deleteResult.rows[0]);

    executor.query(revokeAnonymousSessionQuery(), [
      input.anonymousSessionId,
      input.revokeReason || 'profile_deleted'
    ], function(revokeError, revokeResult) {
      if (revokeError) {
        callback(revokeError, null);
        return;
      }

      callback(null, {
        profile: profile,
        session: revokeResult.rows[0] ? sessionRow(revokeResult.rows[0]) : null
      });
    });
  });
}

export function deleteOwnedProfileAndRevoke(input: DeleteProfileInput, callback: DeletedAnonymousProfileCallback): void {
  let deleted: DeletedAnonymousProfile | null = null;

  db.transaction(function(client, done) {
    deleteOwnedProfileAndRevokeWithExecutor(client, input, function(error, result) {
      if (error) {
        done(error);
        return;
      }

      deleted = result;
      done();
    });
  }, function(error) {
    callback(error || null, error ? null : deleted);
  });
}
