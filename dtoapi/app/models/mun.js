'use strict';

const Nodal = require('nodal');

class Mun extends Nodal.Model {}

Mun.setDatabase(Nodal.require('db/main.js'));
Mun.setSchema(Nodal.my.Schema.models.Mun);

module.exports = Mun;
