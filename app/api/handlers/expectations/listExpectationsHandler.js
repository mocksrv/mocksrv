/**
 * Handler for listing all expectations
 * @module api/handlers/expectations/listExpectationsHandler
 */

import { getAllExpectations } from '../../../expectations/expectationStore.js';

/**
 * Handles request for listing all expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {void}
 */
export function listExpectationsHandler(req, res) {
  try {
    const expectations = getAllExpectations();
    res.json(expectations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 
