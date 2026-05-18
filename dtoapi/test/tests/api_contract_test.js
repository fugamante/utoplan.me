'use strict';

const Nodal = require('nodal');
const zlib = require('zlib');

class ApiContractTest extends Nodal.mocha.Test {

  test(expect) {

    it('Should expose the expected public routes', () => {

      const routes = this.router._routes.map(route => route.path);

      expect(routes).to.deep.equal([
        '/',
        '/v1/unis/{id}',
        '/v1/grace_cs/{id}',
        '/v1/busines/{id}',
        '/v1/cbps/{id}',
        '/v1/muns/{id}',
        '/v1/cdepts/{id}'
      ]);

    });

    it('Should return the root API payload', done => {

      this.endpoint('/').get((status, headers, body, json) => {

        expect(status).to.equal(200);
        expect(headers['Content-Type']).to.equal('application/json; charset=utf-8');
        expect(json.meta.error).to.equal(null);
        expect(json.data).to.deep.equal([
          {message: 'Welcome to your Nodal Project'}
        ]);
        done();

      });

    });

    it('Should include CORS headers on root responses', done => {

      this.endpoint('/').get((status, headers) => {

        expect(status).to.equal(200);
        expect(headers['Access-Control-Allow-Origin']).to.equal('*');
        expect(headers['Access-Control-Allow-Headers']).to.contain('Authorization');
        expect(headers['Access-Control-Allow-Methods']).to.contain('GET');
        done();

      });

    });

    it('Should gzip JSON responses when requested', done => {

      this.router.dispatch(
        this.router.prepare('::1', '/', 'GET', {'accept-encoding': 'gzip'}, null),
        (err, status, headers, body) => {

          expect(err).to.equal(null);
          expect(status).to.equal(200);
          expect(headers['Content-Encoding']).to.equal('gzip');

          zlib.gunzip(body, (gzipErr, result) => {

            expect(gzipErr).to.equal(null);
            expect(JSON.parse(result.toString()).data).to.deep.equal([
              {message: 'Welcome to your Nodal Project'}
            ]);
            done();

          });

        }
      );

    });

  }

}

module.exports = ApiContractTest;
