'use strict';

const Nodal = require('nodal');

class CreateUnis extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100904102839;
  }

  up() {

    return [
      this.createTable("unis", [{"name":"title","type":"string"},{"name":"address","type":"string"},{"name":"desc","type":"string"},{"name": "lat", "type": "float"},{"name": "long", "type": "float"}])
    ];

  }

  down() {

    return [
      this.dropTable("unis")
    ];

  }

}

module.exports = CreateUnis;
