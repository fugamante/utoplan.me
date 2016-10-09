'use strict';

const Nodal = require('nodal');
const router = new Nodal.Router();

/* Middleware */
/* executed *before* Controller-specific middleware */

const CORSMiddleware = Nodal.require('middleware/cors_middleware.js');
// const CORSAuthorizationMiddleware = Nodal.require('middleware/cors_authorization_middleware.js');
// const ForceWWWMiddleware = Nodal.require('middleware/force_www_middleware.js');
// const ForceHTTPSMiddleware = Nodal.require('middleware/force_https_middleware.js');

router.middleware.use(CORSMiddleware);
// router.middleware.use(CORSAuthorizationMiddleware);
// router.middleware.use(ForceWWWMiddleware);
// router.middleware.use(ForceHTTPSMiddleware);

/* Renderware */
/* executed *after* Controller-specific renderware */

const GzipRenderware = Nodal.require('renderware/gzip_renderware.js')

router.renderware.use(GzipRenderware);

/* Routes */

const IndexController = Nodal.require('app/controllers/index_controller.js');

const V1UnisController = Nodal.require('app/controllers/v1/unis_controller.js');
const V1GraceCsController = Nodal.require('app/controllers/v1/grace_cs_controller.js');
const V1BusinesController = Nodal.require('app/controllers/v1/busines_controller.js');
const V1CbpsController = Nodal.require('app/controllers/v1/cbps_controller.js');
const V1MunsController = Nodal.require('app/controllers/v1/muns_controller.js');
const V1CdeptsController = Nodal.require('app/controllers/v1/cdepts_controller.js');
/* generator: begin imports */
/* generator: end imports */

router.route('/').use(IndexController);

/* generator: begin routes */
router.route('/v1/unis/{id}').use(V1UnisController);
router.route('/v1/grace_cs/{id}').use(V1GraceCsController);
router.route('/v1/busines/{id}').use(V1BusinesController);
router.route('/v1/cbps/{id}').use(V1CbpsController);
router.route('/v1/muns/{id}').use(V1MunsController);
router.route('/v1/cdepts/{id}').use(V1CdeptsController);

/* generator: end routes */

module.exports = router;
