'use strict';

const Nodal = require('nodal');

class Cdepts extends Nodal.Model {}

Cdepts.setDatabase(Nodal.require('db/main.js'));
Cdepts.setSchema(Nodal.my.Schema.models.Cdept);

module.exports = Cdepts;
