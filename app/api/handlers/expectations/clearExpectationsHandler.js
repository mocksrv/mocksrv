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

    // Jeśli jest body request, sprawdź czy to RequestDefinition lub ExpectationId
    if (Object.keys(req.body).length > 0) {
      const requestBody = req.body;
      
      // Sprawdź czy to ExpectationId
      if (requestBody.id && Object.keys(requestBody).length === 1) {
        const success = await removeExpectation(requestBody.id);
        if (!success) {
          // Zgodnie ze specyfikacją OpenAPI, zwracamy 400 dla nieprawidłowych danych
          return res.status(400).json({
            error: 'incorrect request format',
            message: `Expectation with id ${requestBody.id} not found`
          });
        }
      } 
      // Sprawdź czy to RequestDefinition
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

    // Zgodnie ze specyfikacją OpenAPI, zwracamy 200 OK
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
