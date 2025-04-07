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
      return res.status(404).json({ error: 'Expectation not found' });
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove expectation' });
  }
} 
