/**
 * Persistence module for expectation storage
 * @module expectations/persistence
 */

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const DEFAULT_PATH = './data/expectations.json';

/**
 * Loads expectations from the persistence file
 * @param {string} [filepath] - Custom file path for loading (optional)
 * @returns {Promise<Map<string, Object>>} Map of expectations
 */
export async function loadExpectations(filepath) {
  const filePath = filepath || DEFAULT_PATH;

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      logger.debug(`No existing expectations file found at ${filePath}, starting with empty store`);
      return new Map();
    }

    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonArray = JSON.parse(data);

    const expectationsMap = new Map();
    jsonArray.forEach(expectation => {
      expectationsMap.set(expectation.id, expectation);
    });

    logger.debug(`Loaded ${expectationsMap.size} expectations from ${filePath}`);
    return expectationsMap;
  } catch (error) {
    logger.error(`Error loading expectations from ${filePath}:`, error);
    return new Map();
  }
}

/**
 * Saves expectations to the persistence file
 * @param {Map<string, Object>} expectations - Map of expectations to save
 * @param {string} [filepath] - Custom file path for saving (optional)
 * @returns {Promise<void>}
 */
export async function saveExpectations(expectations, filepath) {
  const filePath = filepath || DEFAULT_PATH;

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonArray = Array.from(expectations.values());

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(jsonArray, null, 2),
      'utf8'
    );

    logger.debug(`Saved ${jsonArray.length} expectations to ${filePath}`);
  } catch (error) {
    logger.error(`Error saving expectations to ${filePath}:`, error);
  }
} 
