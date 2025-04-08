/**
 * API Routes for MockServer
 * @module api/routes
 */

import express from 'express';
import { createExpectationHandler } from './handlers/expectations/createExpectationHandler.js';
import { clearExpectationsHandler } from './handlers/expectations/clearExpectationsHandler.js';
import { statusHandler } from './handlers/statusHandler.js';
import { retrieveHandler } from './handlers/retrieveHandler.js';

// Dodatkowe importy - jeśli handlery istnieją, należy je zaimportować
// import { verifyHandler } from './handlers/verify/verifyHandler.js';
// import { verifySequenceHandler } from './handlers/verify/verifySequenceHandler.js';
// import { stopHandler } from './handlers/stopHandler.js';
// import { bindHandler } from './handlers/bindHandler.js';
// import { openAPIExpectationHandler } from './handlers/expectations/openAPIExpectationHandler.js';

const router = express.Router();

// Expectation endpoints
router.put('/mockserver/expectation', createExpectationHandler);
// router.put('/mockserver/openapi', openAPIExpectationHandler); // Zgodnie ze specyfikacją

// Control endpoints
router.put('/mockserver/clear', clearExpectationsHandler);
router.put('/mockserver/reset', clearExpectationsHandler);
router.put('/mockserver/retrieve', retrieveHandler);
router.put('/mockserver/status', statusHandler);
// router.put('/mockserver/bind', bindHandler); // Zgodnie ze specyfikacją
// router.put('/mockserver/stop', stopHandler); // Zgodnie ze specyfikacją

// Verify endpoints
// router.put('/mockserver/verify', verifyHandler); // Zgodnie ze specyfikacją
// router.put('/mockserver/verifySequence', verifySequenceHandler); // Zgodnie ze specyfikacją

export default router; 
