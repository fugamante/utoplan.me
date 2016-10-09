'use strict';

const Nodal = require('nodal');

class CreateCbps extends Nodal.Migration {

  constructor(db) {
    super(db);
    this.id = 2016100904134807;
  }

  up() {

    return [
      this.createTable("cbps", [{"name":"total_indus","type":"float"},{"name":"total_anual","type":"float"},{"name":"cnaic","type":"int"},{"name":"county","type":"int"},{"name":"num_est","type":"int"}])
    ];

  }

  down() {

    return [
      this.dropTable("cbps")
    ];

  }

}

module.exports = CreateCbps;
