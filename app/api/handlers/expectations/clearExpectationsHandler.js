/**
 * Handler for clearing all expectations
 * @module api/handlers/expectations/clearExpectationsHandler
 */

import { clearExpectations, removeExpectation } from '../../../expectations/expectationStore.js';

/**
 * Handles request for clearing all expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
export async function clearExpectationsHandler(req, res) {
  try {
    const type = req.query.type || 'all';
    const typeNormalized = type.toLowerCase();
    
    if (!['all', 'log', 'expectations'].includes(typeNormalized)) {
      return res.status(400).json({
        error: 'incorrect request format',
        message: 'Invalid type parameter. Supported values are: all, log, expectations'
      });
    }

    
    if (Object.keys(req.body).length > 0) {
      const requestBody = req.body;
      
      
      if (requestBody.id && Object.keys(requestBody).length === 1) {
        const success = await removeExpectation(requestBody.id);
        if (!success) {
          
          return res.status(400).json({
            error: 'incorrect request format',
            message: `Expectation with id ${requestBody.id} not found`
          });
        }
      } 
      
      else if (requestBody.method || requestBody.path) {
        await clearExpectations({ request: requestBody });
      }
      else {
        return res.status(400).json({
          error: 'incorrect request format',
          message: 'Request body must be either RequestDefinition or ExpectationId'
        });
      }
    } else {
      await clearExpectations();
    }

    
    return res.status(200).json({
      message: 'expectations and recorded requests cleared'
    });
  } catch (error) {
    res.status(400).json({
      error: 'incorrect request format',
      message: error.message
    });
  }
} 
