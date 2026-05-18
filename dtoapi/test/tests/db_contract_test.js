'use strict';

const Nodal = require('nodal');
const db = Nodal.require('db/main.js');

class DbContractTest extends Nodal.mocha.Test {

  test(expect) {

    before(function() {

      if (process.env.RUN_DB_CONTRACTS !== '1') {
        this.skip();
      }

    });

    after(function(done) {

      if (process.env.RUN_DB_CONTRACTS === '1') {
        db.close();
        return setTimeout(done, 10);
      }

      done();

    });

    const cases = [
      {
        path: '/v1/unis/1',
        expected: {
          id: 1,
          title: 'Contract University',
          address: '100 Contract Ave',
          desc: 'Seeded university row'
        }
      },
      {
        path: '/v1/muns/1',
        expected: {
          id: 1,
          title: 'Contract Municipality',
          county: 1
        }
      },
      {
        path: '/v1/cdepts/1',
        expected: {
          id: 1,
          cnaic: 541
        }
      },
      {
        path: '/v1/cbps/1',
        expected: {
          id: 1,
          cnaic: 541,
          county: 1,
          cnaic_name: 'Professional Services'
        }
      },
      {
        path: '/v1/busines/1',
        expected: {
          id: 1,
          cdepts_id: 1,
          title: 'Contract Business',
          address: '200 Contract St'
        }
      },
      {
        path: '/v1/grace_cs/1',
        expected: {
          id: 1,
          uni_id: 1,
          cdepts_id: 1,
          rate: '92',
          year: '2016'
        }
      }
    ];

    cases.forEach(contract => {

      it('Should return seeded data for ' + contract.path, done => {

        this.endpoint(contract.path).get((status, headers, body, json) => {

          expect(status).to.equal(200);
          expect(json.meta.error).to.equal(null);
          expect(json.data[0]).to.include(contract.expected);
          done();

        });

      });

    });

  }

}

module.exports = DbContractTest;
