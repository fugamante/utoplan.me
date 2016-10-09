'use strict';

const Nodal = require('nodal');

class Uni extends Nodal.Model {}

Uni.setDatabase(Nodal.require('db/main.js'));
Uni.setSchema(Nodal.my.Schema.models.Uni);

module.exports = Uni;
