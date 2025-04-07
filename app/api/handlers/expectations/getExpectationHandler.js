/**
 * Handler for getting a specific expectation
 * @module api/handlers/expectations/getExpectationHandler
 */

import { getExpectation } from '../../../expectations/expectationStore.js';

/**
 * Handles request for getting a specific expectation by ID
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {void}
 */
export function getExpectationHandler(req, res) {
  try {
    const id = req.params.id;
    const expectation = getExpectation(id);

    if (!expectation) {
      return res.status(404).json({ error: 'Expectation not found' });
    }

    res.json(expectation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 