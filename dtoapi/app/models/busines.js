'use strict';

const Nodal = require('nodal');
const Cdept = Nodal.require('app/models/cdept.js');

class Busines extends Nodal.Model {}

Busines.setDatabase(Nodal.require('db/main.js'));
Busines.setSchema(Nodal.my.Schema.models.Business);

Busines.joinsTo(Cdept, {mutiple:true});

module.exports = Busines;
