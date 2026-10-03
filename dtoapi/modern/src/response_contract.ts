'use strict';

export interface ResponseMeta {
  total: number;
  count: number;
  offset: number;
  error: string | null;
  coverage?: unknown;
}

export interface ResponsePayload<T> {
  meta: ResponseMeta;
  data: T[];
}

export function meta(count: number, error?: string | null): ResponseMeta {
  return {
    total: count,
    count: count,
    offset: 0,
    error: error || null
  };
}

export function payload<T>(data?: T[], error?: string | null): ResponsePayload<T> {
  const records = data || [];

  return {
    meta: meta(records.length, error),
    data: records
  };
}

export function errorPayload(message: string): ResponsePayload<never> {
  return payload([], message);
}

export function serialize(body: unknown): string {
  return JSON.stringify(body, null, 2);
}
