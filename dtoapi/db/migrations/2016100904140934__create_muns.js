'use strict';

const Nodal = require('nodal');

class CreateMuns extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100904140934;
  }

  up() {

    return [
      this.createTable("muns", [{"name":"title","type":"string"},{"name":"county","type":"int"}])
    ];

  }

  down() {

    return [
      this.dropTable("muns")
    ];

  }

}

module.exports = CreateMuns;
