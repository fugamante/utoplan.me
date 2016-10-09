'use strict';

const Nodal = require('nodal');
const Busines = Nodal.require('app/models/busines.js');
const Cdept = Nodal.require('app/models/cdept.js');

class V1BusinesController extends Nodal.Controller {

  index() {

    Busines.query()
      .join('cdepts')
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models, [{cdepts:['cnaic']}, 'get','title','address']);

      });

  }

  show() {

    Busines.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    Busines.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    Busines.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    Busines.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1BusinesController;
