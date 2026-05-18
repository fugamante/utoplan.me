'use strict';

import type {QueryResult} from './db_bridge';
import type {DatabaseRow, Resource} from './resource_contract';
import * as db from '../db';
import * as resourceContract from './resource_contract';
import * as responseContract from './response_contract';

export type FindCallback = (error: Error | null, row: DatabaseRow | null, resource: Resource | null) => void;

export function payload(row: DatabaseRow | null, resource: Resource): responseContract.ResponsePayload<resourceContract.PublicRecord> {
  const data = row ? [resourceContract.serialize(row, resource)] : [];

  return responseContract.payload(data);
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
