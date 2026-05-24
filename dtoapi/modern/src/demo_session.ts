'use strict';

import * as db from './db';
import * as planningContext from './planning_context';
import type {DatabaseRow} from './resource_contract';

export const SUPPORTED_SESSION_QUERY_PARAMS = ['session'];

export interface DemoSessionQuery {
  session: string;
}

export interface QueryParseResult {
  ok: boolean;
  query: DemoSessionQuery | null;
  error: string | null;
}

export interface DemoSession {
  id: string;
  displayName: string;
  selectedMunicipalityId: number;
  selectedCategoryId: string;
  profile: Record<string, unknown>;
}

export interface DemoSessionPayload {
  schemaVersion: number;
  scope: string;
  mode: 'demo-db-session';
  generatedFrom: {
    databaseSchema: string;
    planningContextEndpoint: string;
  };
  session: DemoSession;
  planningContext: planningContext.PlanningContextPayload;
}

export type DemoSessionCallback = (error: Error | null, payload: DemoSessionPayload | null) => void;

export function endpointEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.UTOPLAN_DEMO_SESSIONS === '1';
}

export function parseSessionQuery(params: URLSearchParams): QueryParseResult {
  const unknownParams = Array.from(params.keys()).filter(function(key) {
    return SUPPORTED_SESSION_QUERY_PARAMS.indexOf(key) === -1;
  });
  const session = params.get('session');
  const sessionPattern = /^[a-z0-9][a-z0-9_-]{2,63}$/;

  if (unknownParams.length > 0) {
    return {
      ok: false,
      query: null,
      error: 'Unsupported query parameter: ' + unknownParams[0]
    };
  }

  if (!session || !sessionPattern.test(session)) {
    return {
      ok: false,
      query: null,
      error: 'session must be a known demo session id'
    };
  }

  return {
    ok: true,
    query: {
      session: session
    },
    error: null
  };
}

export function selectSessionByPublicId(): string {
  return [
    'SELECT public_id, display_name, municipality_id, category_id, profile',
    'FROM demo_sessions',
    'WHERE public_id = $1',
    'LIMIT 1'
  ].join(' ');
}

function profileFromRow(row: DatabaseRow): Record<string, unknown> {
  if (!row.profile) {
    return {};
  }

  if (typeof row.profile === 'string') {
    return JSON.parse(row.profile) as Record<string, unknown>;
  }

  return row.profile as Record<string, unknown>;
}

export function sessionFromRow(row: DatabaseRow): DemoSession {
  return {
    id: String(row.public_id),
    displayName: String(row.display_name || ''),
    selectedMunicipalityId: Number(row.municipality_id),
    selectedCategoryId: String(row.category_id),
    profile: profileFromRow(row)
  };
}

export function payload(query: DemoSessionQuery, callback: DemoSessionCallback): void {
  db.query(selectSessionByPublicId(), [query.session], function(error, result) {
    if (error) {
      callback(error, null);
      return;
    }

    if (!result.rows[0]) {
      callback(null, null);
      return;
    }

    const session = sessionFromRow(result.rows[0]);

    planningContext.livePayload({
      municipality: session.selectedMunicipalityId,
      category: session.selectedCategoryId
    }, function(contextError, contextPayload) {
      if (contextError) {
        callback(contextError, null);
        return;
      }

      if (!contextPayload) {
        callback(null, null);
        return;
      }

      callback(null, {
        schemaVersion: 1,
        scope: 'puerto-rico-only',
        mode: 'demo-db-session',
        generatedFrom: {
          databaseSchema: 'baseline-read-v1',
          planningContextEndpoint: '/v1/planning/context'
        },
        session: session,
        planningContext: contextPayload
      });
    });
  });
}
