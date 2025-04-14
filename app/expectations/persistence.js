/**
 * Persistence module for expectation storage
 * @module expectations/persistence
 */

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import lockfile from 'proper-lockfile';
import crypto from 'crypto';

const DEFAULT_PATH = process.env.MOCKSRV_EXPECTATIONS_PATH || './data/expectations.json';

let isSaving = false;
let lastSavedContent = null;
let lastFileHash = null;
let fileWatcherInterval = null;

/**
 * @param {string} filePath - Ścieżka do pliku
 * @returns {string} Hash pliku lub null jeśli plik nie istnieje
 */
function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * @returns {boolean} True if file is being saved
 */
export function isFileSaving() {
    return isSaving;
}

/**
 * @returns {Array|null} Last saved content or null if none
 */
export function getLastSavedContent() {
    return lastSavedContent;
}

/**
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

    const release = await lockfile.lock(filePath, { 
      retries: 10,
      retryWait: 100,
      stale: 10000,
      shared: true
    });

    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      const jsonArray = JSON.parse(data);

      lastSavedContent = jsonArray;
      lastFileHash = calculateFileHash(filePath);

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
    } finally {
      release();
    }
  } catch (error) {
    logger.error('Failed to load expectations', {
      event: 'PERSISTENCE_LOAD_ERROR',
      path: filePath,
      error: error.message,
      stack: error.stack
    });

    if (lastSavedContent) {
      const expectationsMap = new Map();
      lastSavedContent.forEach(expectation => {
        expectationsMap.set(expectation.id, expectation);
      });
      return expectationsMap;
    }
    return new Map();
  }
}

/**
 * @param {Map<string, Object>} expectations - Map of expectations to save
 * @param {string} [filepath] - Custom file path for saving (optional)
 * @returns {Promise<void>}
 */
export async function saveExpectations(expectations, filepath) {
  const filePath = filepath || DEFAULT_PATH;

  let release;
  try {
    isSaving = true;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    release = await lockfile.lock(filePath, { 
      retries: 10,
      retryWait: 100,
      stale: 10000,
      shared: false
    });

    const jsonArray = Array.from(expectations.values());
    
    const jsonContent = JSON.stringify(jsonArray.length ? jsonArray : [], null, 2);

    try {
      JSON.parse(jsonContent);
    } catch (parseError) {
      throw new Error(`Invalid JSON content: ${parseError.message}`);
    }

    await fs.promises.writeFile(filePath, jsonContent, { 
      encoding: 'utf8',
      flag: 'w'
    });
    
    lastSavedContent = jsonArray;
    lastFileHash = calculateFileHash(filePath);

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
  } finally {
    if (release) {
      await release();
    }
    isSaving = false;
  }
}

/**
 * @param {string} filePath - Path to watch
 * @param {Function} onChange - Callback when file changes
 * @returns {Function} Function to stop watching
 */
export function watchFile(filePath, onChange) {
  if (fileWatcherInterval) {
    clearInterval(fileWatcherInterval);
  }

  lastFileHash = calculateFileHash(filePath);
  logger.debug('Started watching file', {
    event: 'FILE_WATCH_START',
    path: filePath,
    initialHash: lastFileHash
  });

  fileWatcherInterval = setInterval(() => {
    if (!isSaving) {
      const currentHash = calculateFileHash(filePath);
      if (currentHash && currentHash !== lastFileHash) {
        logger.debug('File change detected', {
          event: 'FILE_CHANGED',
          path: filePath,
          oldHash: lastFileHash,
          newHash: currentHash
        });
        lastFileHash = currentHash;
        onChange();
      }
    }
  }, 1000);

  return () => {
    if (fileWatcherInterval) {
      clearInterval(fileWatcherInterval);
      fileWatcherInterval = null;
      logger.debug('Stopped watching file', {
        event: 'FILE_WATCH_STOP',
        path: filePath
      });
    }
  };
} 
