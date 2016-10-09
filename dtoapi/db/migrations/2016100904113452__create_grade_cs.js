'use strict';

const Nodal = require('nodal');

class CreateGradeCs extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100904113452;
  }

  up() {

    return [
      this.createTable("grade_cs", [{"name":"uni_id","type":"int"},{"name":"cdepts_id","type":"int"},{"name":"rate","type":"string"},{"name":"year","type":"string"}])
    ];

  }

  down() {

    return [
      this.dropTable("grade_cs")
    ];

  }

}

module.exports = CreateGradeCs;
