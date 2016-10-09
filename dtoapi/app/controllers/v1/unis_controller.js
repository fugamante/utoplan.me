'use strict';

const Nodal = require('nodal');
const Uni = Nodal.require('app/models/uni.js');

class V1UnisController extends Nodal.Controller {

  index() {

    Uni.query()
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models);

      });

  }

  show() {

    Uni.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    Uni.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    Uni.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    Uni.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1UnisController;
