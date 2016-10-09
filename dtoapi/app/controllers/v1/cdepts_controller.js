'use strict';

const Nodal = require('nodal');
const Cdept = Nodal.require('app/models/cdept.js');

class V1CdeptsController extends Nodal.Controller {

  index() {

    Cdept.query()
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models);

      });

  }

  show() {

    Cdept.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    Cdept.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    Cdept.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    Cdept.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1CdeptsController;
