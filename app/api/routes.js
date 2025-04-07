/**
 * API Routes for MockServer
 * @module api/routes
 */

import express from 'express';
import { createExpectationHandler } from './handlers/expectations/createExpectationHandler.js';
import { getExpectationHandler } from './handlers/expectations/getExpectationHandler.js';
import { listExpectationsHandler } from './handlers/expectations/listExpectationsHandler.js';
import { deleteExpectationHandler } from './handlers/expectations/deleteExpectationHandler.js';
import { clearExpectationsHandler } from './handlers/expectations/clearExpectationsHandler.js';

const router = express.Router();

router.put('/mockserver/expectation', createExpectationHandler);
router.post('/mockserver/expectation', createExpectationHandler);

router.get('/mockserver/expectation', listExpectationsHandler);
router.get('/mockserver/expectation/active', listExpectationsHandler);

router.get('/mockserver/expectation/:id', getExpectationHandler);

router.delete('/mockserver/expectation/:id', deleteExpectationHandler);
router.delete('/mockserver/expectation', clearExpectationsHandler);

router.put('/mockserver/reset', clearExpectationsHandler);

export default router; 
