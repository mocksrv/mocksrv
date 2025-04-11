/**
 * Persistence module for expectation storage
 * @module expectations/persistence
 */

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';


const DEFAULT_PATH = process.env.MOCKSRV_EXPECTATIONS_PATH || './data/expectations.json';

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
      logger.debug('Starting with empty store', {
        event: 'PERSISTENCE_EMPTY',
        path: filePath
      });
      return new Map();
    }

    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonArray = JSON.parse(data);

    const expectationsMap = new Map();
    jsonArray.forEach(expectation => {
      expectationsMap.set(expectation.id, expectation);
    });

    logger.debug('Expectations loaded from file', {
      event: 'PERSISTENCE_LOADED',
      path: filePath,
      count: expectationsMap.size
    });
    
    return expectationsMap;
  } catch (error) {
    logger.error('Failed to load expectations', {
      event: 'PERSISTENCE_LOAD_ERROR',
      path: filePath,
      error: error.message,
      stack: error.stack
    });
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
      JSON.stringify(jsonArray.length ? jsonArray : [], null, 2),
      'utf8'
    );

    logger.debug('Expectations saved to file', {
      event: 'PERSISTENCE_SAVED',
      path: filePath,
      count: jsonArray.length
    });
  } catch (error) {
    logger.error('Failed to save expectations', {
      event: 'PERSISTENCE_SAVE_ERROR',
      path: filePath,
      error: error.message,
      stack: error.stack
    });
  }
} 
