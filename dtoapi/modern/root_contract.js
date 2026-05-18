'use strict';

const responseContract = require('./lib/response_contract');

const ROOT_DATA = [
  {message: 'Welcome to your Nodal Project'}
];

function rootPayload() {
  return responseContract.payload(ROOT_DATA);
}

function serializeRootPayload() {
  return responseContract.serialize(rootPayload());
}

module.exports = {
  ROOT_DATA: ROOT_DATA,
  rootPayload: rootPayload,
  serializeRootPayload: serializeRootPayload
};
