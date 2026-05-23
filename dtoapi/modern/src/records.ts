'use strict';

import type {DatabaseRow, Resource} from './resource_contract';
import type {QueryResult} from './db';
import * as db from './db';
import * as resourceContract from './resource_contract';
import * as responseContract from './response_contract';

export type FindCallback = (error: Error | null, row: DatabaseRow | null, resource: Resource | null) => void;
export type ListCallback = (
  error: Error | null,
  rows: DatabaseRow[],
  resource: Resource | null,
  total: number,
  offset: number
) => void;

export interface CollectionQuery {
  limit: number | null;
  offset: number;
}

export function payload(row: DatabaseRow | null, resource: Resource): responseContract.ResponsePayload<resourceContract.PublicRecord> {
  const data = row ? [resourceContract.serialize(row, resource)] : [];

  return responseContract.payload(data);
}

export function collectionPayload(
  rows: DatabaseRow[],
  resource: Resource,
  total?: number,
  offset?: number
): responseContract.ResponsePayload<resourceContract.PublicRecord> {
  const data = rows.map(function(row: DatabaseRow): resourceContract.PublicRecord {
    return resourceContract.serialize(row, resource);
  });

  return responseContract.payload(data, null, total, offset);
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

function countTotal(row: DatabaseRow | undefined): number {
  return Number(row ? row.total || 0 : 0);
}

export function list(kind: string, query: CollectionQuery, callback: ListCallback): void {
  const resource = resourceContract.get(kind);

  if (!resource) {
    callback(null, [], null, 0, query.offset);
    return;
  }

  db.query(resourceContract.countAll(resource), [], function(countError: Error | null, countResult: QueryResult) {
    const params: number[] = [];

    if (countError) {
      callback(countError, [], resource, 0, query.offset);
      return;
    }

    if (query.limit !== null) {
      params.push(query.limit);
    }

    if (query.offset > 0) {
      params.push(query.offset);
    }

    db.query(resourceContract.selectPage(resource, query.limit !== null, query.offset > 0), params, function(error: Error | null, result: QueryResult) {
      if (error) {
        callback(error, [], resource, 0, query.offset);
        return;
      }

      callback(null, result.rows, resource, countTotal(countResult.rows[0]), query.offset);
    });
  });
}
