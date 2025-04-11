/**
 * API Routes for MockServer
 * @module api/routes
 */

import express from 'express';
import { createExpectationHandler } from './handlers/expectations/createExpectationHandler.js';
import { clearExpectationsHandler } from './handlers/expectations/clearExpectationsHandler.js';
import { statusHandler } from './handlers/statusHandler.js';
import { retrieveHandler } from './handlers/retrieveHandler.js';








const router = express.Router();


router.put('/mockserver/expectation', createExpectationHandler);



router.put('/mockserver/clear', clearExpectationsHandler);
router.put('/mockserver/reset', clearExpectationsHandler);
router.put('/mockserver/retrieve', retrieveHandler);
router.put('/mockserver/status', statusHandler);







export default router; 
