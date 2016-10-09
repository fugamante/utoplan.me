'use strict';

const Nodal = require('nodal');

class CreateCdepts extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100907055933;
  }

  up() {

    return [
      this.createTable("cdepts", [{"name":"cnaic","type":"int"}])
    ];

  }

  down() {

    return [
      this.dropTable("cdepts")
    ];

  }

}

module.exports = CreateCdepts;
