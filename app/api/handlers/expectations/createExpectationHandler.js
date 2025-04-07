/**
 * Handler for creating expectations
 * @module api/handlers/expectations/createExpectationHandler
 */

import { addExpectation } from '../../../expectations/expectationStore.js';

/**
 * Handles creation of new expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
export async function createExpectationHandler(req, res) {
  try {
    const expectation = req.body;

    if (!expectation.httpRequest) {
      return res.status(400).json({ error: 'Brak pola httpRequest w oczekiwaniu' });
    }

    if (!expectation.type) {
      expectation.type = 'http';
    } else if (expectation.type !== 'http') {
      return res.status(400).json({
        error: 'Nieprawidłowy typ oczekiwania. Obsługiwany jest tylko typ: http'
      });
    }

    const id = await addExpectation(expectation);

    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 
