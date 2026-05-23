'use strict';

export interface Resource {
  table: string;
  columns: string[];
}

export type ResourceName = 'unis' | 'muns' | 'cdepts' | 'cbps' | 'businesses' | 'grade_cs';

export type DatabaseRow = Record<string, unknown>;

export type PublicRecord = Record<string, unknown>;

export const resources: Record<ResourceName, Resource> = {
  unis: {
    table: 'unis',
    columns: ['id', 'title', 'address', 'desc', 'lat', 'long', 'created_at', 'updated_at']
  },
  muns: {
    table: 'muns',
    columns: ['id', 'title', 'county', 'created_at', 'updated_at']
  },
  cdepts: {
    table: 'cdepts',
    columns: ['id', 'cnaic', 'created_at', 'updated_at']
  },
  cbps: {
    table: 'cbps',
    columns: ['id', 'total_indus', 'total_anual', 'cnaic', 'cnaic_name', 'county', 'num_est', 'created_at', 'updated_at']
  },
  businesses: {
    table: 'businesses',
    columns: ['id', 'cdepts_id', 'lat', 'long', 'title', 'address', 'created_at', 'updated_at']
  },
  grade_cs: {
    table: 'grade_cs',
    columns: ['id', 'uni_id', 'cdepts_id', 'rate', 'year', 'created_at', 'updated_at']
  }
};

const routeAliases: Record<string, ResourceName> = {
  busines: 'businesses',
  grace_cs: 'grade_cs'
};

function quoteColumn(column: string): string {
  return column === 'desc' || column === 'long' ? '"' + column + '"' : column;
}

export function resolveName(kind: string): ResourceName | null {
  if (Object.prototype.hasOwnProperty.call(resources, kind)) {
    return kind as ResourceName;
  }

  return routeAliases[kind] || null;
}

export function get(kind: string): Resource | null {
  const resourceName = resolveName(kind);

  return resourceName ? resources[resourceName] : null;
}

export function names(): ResourceName[] {
  return Object.keys(resources) as ResourceName[];
}

export function routeNames(): string[] {
  return (Object.keys(resources) as string[]).concat(Object.keys(routeAliases)).sort();
}

export function selectById(resource: Resource): string {
  const columns = resource.columns.map(quoteColumn).join(', ');

  return 'SELECT ' + columns + ' FROM ' + resource.table + ' WHERE id = $1 LIMIT 1';
}

export function selectAll(resource: Resource): string {
  const columns = resource.columns.map(quoteColumn).join(', ');

  return 'SELECT ' + columns + ' FROM ' + resource.table + ' ORDER BY id';
}

export function serialize(row: DatabaseRow, resource: Resource): PublicRecord {
  return resource.columns.reduce(function(record: PublicRecord, column: string) {
    record[column] = row[column];
    return record;
  }, {});
}
