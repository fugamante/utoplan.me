'use strict';

const ROOT_DATA = [
  {message: 'Welcome to your Nodal Project'}
];

function rootPayload() {
  return {
    meta: {
      total: ROOT_DATA.length,
      count: ROOT_DATA.length,
      offset: 0,
      error: null
    },
    data: ROOT_DATA
  };
}

function serializeRootPayload() {
  return JSON.stringify(rootPayload(), null, 2);
}

module.exports = {
  ROOT_DATA: ROOT_DATA,
  rootPayload: rootPayload,
  serializeRootPayload: serializeRootPayload
};
