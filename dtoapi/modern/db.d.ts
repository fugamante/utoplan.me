import type {QueryCallback} from './src/db_bridge';

export function query(text: string, params: unknown[], callback: QueryCallback): void;
