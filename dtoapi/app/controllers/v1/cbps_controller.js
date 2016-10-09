'use strict';

const Nodal = require('nodal');
const Cbp = Nodal.require('app/models/cbp.js');

class V1CbpsController extends Nodal.Controller {

  index() {

    Cbp.query()
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models);

      });

  }

  show() {

    Cbp.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    Cbp.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    Cbp.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    Cbp.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1CbpsController;
