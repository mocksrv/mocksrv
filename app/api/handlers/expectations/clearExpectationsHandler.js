/**
 * Handler for clearing all expectations
 * @module api/handlers/expectations/clearExpectationsHandler
 */

import { clearExpectations } from '../../../expectations/expectationStore.js';

/**
 * Handles request for clearing all expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
export async function clearExpectationsHandler(req, res) {
  try {
    await clearExpectations();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear expectations' });
  }
} 
