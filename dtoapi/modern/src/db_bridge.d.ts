import type {DatabaseRow} from './resource_contract';

export interface QueryResult {
  rows: DatabaseRow[];
}

export type QueryCallback = (error: Error | null, result: QueryResult) => void;
