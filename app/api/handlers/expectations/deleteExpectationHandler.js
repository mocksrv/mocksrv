/**
 * Handler for deleting a specific expectation
 * @module api/handlers/expectations/deleteExpectationHandler
 */

import { removeExpectation } from '../../../expectations/expectationStore.js';

/**
 * Handles request for deleting a specific expectation by ID
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
export async function deleteExpectationHandler(req, res) {
  try {
    const id = req.params.id;
    const deleted = await removeExpectation(id);

    if (!deleted) {
      // Zgodnie ze specyfikacją OpenAPI, dla nieprawidłowych danych zwracamy 400
      return res.status(400).json({ 
        error: 'incorrect request format', 
        message: 'Expectation not found'
      });
    }

    // Dla usuwania pojedynczego zasobu zwracamy 204 No Content zgodnie z testami
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ 
      error: 'incorrect request format', 
      message: error.message
    });
  }
} 
