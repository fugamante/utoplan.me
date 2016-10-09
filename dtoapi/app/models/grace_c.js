'use strict';

const Nodal = require('nodal');
const Uni = Nodal.require('app/models/uni.js');
const Cdept = Nodal.require('app/models/cdept.js');

class GradeC extends Nodal.Model {}

GradeC.setDatabase(Nodal.require('db/main.js'));
GradeC.setSchema(Nodal.my.Schema.models.GradeC);

GradeC.joinsTo(Uni, {multiple: true});
GradeC.joinsTo(Cdept, {multiple: true});

module.exports = GradeC;
