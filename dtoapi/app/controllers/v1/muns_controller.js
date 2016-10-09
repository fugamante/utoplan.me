'use strict';

const Nodal = require('nodal');
const Mun = Nodal.require('app/models/mun.js');

class V1MunsController extends Nodal.Controller {

  index() {

    Mun.query()
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models);

      });

  }

  show() {

    Mun.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    Mun.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    Mun.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    Mun.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1MunsController;
