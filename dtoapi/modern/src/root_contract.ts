'use strict';

import * as responseContract from './response_contract';

export interface RootRecord {
  message: string;
}

export const ROOT_DATA: RootRecord[] = [
  {message: 'Welcome to your Nodal Project'}
];

export function rootPayload(): responseContract.ResponsePayload<RootRecord> {
  return responseContract.payload(ROOT_DATA);
}

export function serializeRootPayload(): string {
  return responseContract.serialize(rootPayload());
}
