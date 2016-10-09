'use strict';

const Nodal = require('nodal');

class Cbp extends Nodal.Model {}

Cbp.setDatabase(Nodal.require('db/main.js'));
Cbp.setSchema(Nodal.my.Schema.models.Cbp);

module.exports = Cbp;
