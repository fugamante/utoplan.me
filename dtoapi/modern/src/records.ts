'use strict';

import type {DatabaseRow, Resource} from './resource_contract';
import type {QueryResult} from './db';
import * as db from './db';
import * as resourceContract from './resource_contract';
import * as responseContract from './response_contract';
import * as unisBoundary from './unis_boundary';

export type FindCallback = (error: Error | null, row: DatabaseRow | null, resource: Resource | null) => void;
export type ListCallback = (error: Error | null, rows: DatabaseRow[], resource: Resource | null) => void;

export function payload(row: DatabaseRow | null, resource: Resource): responseContract.ResponsePayload<resourceContract.PublicRecord> {
  const data = row ? [resourceContract.serialize(row, resource)] : [];

  return responseContract.payload(data);
}

export function collectionPayload(rows: DatabaseRow[], resource: Resource): responseContract.ResponsePayload<resourceContract.PublicRecord> {
  const data = rows.map(function(row: DatabaseRow): resourceContract.PublicRecord {
    return resourceContract.serialize(row, resource);
  });
  const payload = responseContract.payload(data);
  const coverage = unisBoundary.collectionCoverage(resource.table);

  if (coverage) {
    payload.meta.coverage = coverage;
  }

  return payload;
}

export function find(kind: string, id: number, callback: FindCallback): void {
  const resource = resourceContract.get(kind);

  if (!resource) {
    callback(null, null, null);
    return;
  }

  db.query(resourceContract.selectById(resource), [id], function(error: Error | null, result: QueryResult) {
    if (error) {
      callback(error, null, resource);
      return;
    }

    callback(null, result.rows[0] || null, resource);
  });
}

export function list(kind: string, callback: ListCallback): void {
  const resource = resourceContract.get(kind);

  if (!resource) {
    callback(null, [], null);
    return;
  }

  db.query(resourceContract.selectAll(resource), [], function(error: Error | null, result: QueryResult) {
    if (error) {
      callback(error, [], resource);
      return;
    }

    callback(null, result.rows, resource);
  });
}
