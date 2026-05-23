'use strict';

export interface ResponseMeta {
  total: number;
  count: number;
  offset: number;
  error: string | null;
}

export interface ResponsePayload<T> {
  meta: ResponseMeta;
  data: T[];
}

export function meta(count: number, error?: string | null, total?: number, offset?: number): ResponseMeta {
  return {
    total: total === undefined ? count : total,
    count: count,
    offset: offset === undefined ? 0 : offset,
    error: error || null
  };
}

export function payload<T>(data?: T[], error?: string | null, total?: number, offset?: number): ResponsePayload<T> {
  const records = data || [];

  return {
    meta: meta(records.length, error, total, offset),
    data: records
  };
}

export function errorPayload(message: string): ResponsePayload<never> {
  return payload([], message);
}

export function serialize(body: unknown): string {
  return JSON.stringify(body, null, 2);
}
