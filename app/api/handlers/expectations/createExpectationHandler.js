/**
 * Handler for creating expectations
 * @module api/handlers/expectations/createExpectationHandler
 */

import { validateExpectation } from '../../../expectations/expectationValidator.js';
import { upsertExpectation } from '../../../expectations/expectationStore.js';
import logger from '../../../utils/logger.js';

/**
 * Handles creation of new expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
export async function createExpectationHandler(req, res) {
  try {
    
    const expectations = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const expectation of expectations) {
      
      const validationError = validateExpectation(expectation);
      if (validationError) {
        return res.status(400).json({ 
          error: 'incorrect request format', 
          message: validationError 
        });
      }
      
      
      try {
        const updatedExpectation = await upsertExpectation(expectation);
        results.push(updatedExpectation);
      } catch (error) {
        logger.error({
          type: 'expectation_create_error',
          error: error.message
        }, `Error upserting expectation: ${error.message}`);
        
        return res.status(406).json({ 
          error: 'invalid expectation',
          message: error.message 
        });
      }
    }
    
    
    res.status(201).json(results);
  } catch (error) {
    logger.error({
      type: 'expectation_handler_error',
      error: error.message
    }, `Error in createExpectationHandler: ${error.message}`);
    
    res.status(400).json({ 
      error: 'incorrect request format',
      message: error.message 
    });
  }
} 
