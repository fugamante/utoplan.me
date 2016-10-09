'use strict';

const Nodal = require('nodal');

class CreateBusines extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100904131102;
  }

  up() {

    return [
      this.createTable("businesses", [{"name":"cdepts_id","type":"int"},{"name": "lat", "type": "int"},{"name": "long", "type": "int"},{"name":"title","type":"string"},{"name":"address","type":"string"}])
    ];

  }

  down() {

    return [
      this.dropTable("businesses")
    ];

  }

}

module.exports = CreateBusines;
