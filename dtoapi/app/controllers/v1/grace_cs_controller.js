'use strict';

const Nodal = require('nodal');
const GraceC = Nodal.require('app/models/grace_c.js');
const Uni = Nodal.require('app/models/uni.js');
const Cdept = Nodal.require('app/models/cdept.js');

class V1GraceCsController extends Nodal.Controller {

  index() {
    GraceC.query()
      .join('uni')
      .join('cdepts')
      .where(this.params.query)
      .end((err, models) => {

        this.respond(err || models, [{uni:['title','address','desc','geo']},{cdepts:['cnaic']},'uni_id','rate','year']);
      });
  }

  show() {

    GraceC.find(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

  create() {

    GraceC.create(this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  update() {

    GraceC.update(this.params.route.id, this.params.body, (err, model) => {

      this.respond(err || model);

    });

  }

  destroy() {

    GraceC.destroy(this.params.route.id, (err, model) => {

      this.respond(err || model);

    });

  }

}

module.exports = V1GraceCsController;
