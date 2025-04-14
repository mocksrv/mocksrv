/**
 * Expectation Store - central repository for all expectations
 * @module expectations/expectationStore
 */

import { v4 as uuidv4 } from 'uuid';
import { loadExpectations, saveExpectations } from './persistence.js';
import {
  initializeIndices,
  indexExpectation,
  removeFromIndices
} from './indexers/indexer.js';
import { findMatchingExpectation } from '../request-handling/matcher.js';
import logger from '../utils/logger.js';
import AsyncLock from 'async-lock';

const lock = new AsyncLock();
const defaultPath = process.env.MOCKSRV_EXPECTATIONS_PATH || './data/expectations.json';

let expectations = new Map();
let persistenceEnabled = true;
let persistencePath = defaultPath;

export function setPersistencePath(path) {
  persistencePath = path;
  logger.info('Setting persistence path', { path });
}


export function getPersistencePath() {
  return persistencePath;
}

export function disablePersistence() {
  persistenceEnabled = false;
  logger.info('Persistence disabled');
}

export function enablePersistence() {
  persistenceEnabled = true;
  logger.info('Persistence enabled');
}

export async function initializeStore() {
  try {
    if (persistenceEnabled) {
      const loadedExpectations = await loadExpectations(persistencePath);
      
      expectations.clear();
      
      const seenIds = new Set();
      
      loadedExpectations.forEach((expectation, id) => {
        let newId = id;
        if (seenIds.has(id)) {
          newId = uuidv4();
          logger.warn('Duplicate expectation ID found, generating new ID', {
            event: 'DUPLICATE_ID',
            oldId: id,
            newId
          });
        }
        seenIds.add(newId);
        
        expectations.set(newId, {
          ...expectation,
          id: newId
        });
      });
    } else {
      expectations = new Map();
    }
    
    initializeIndices(expectations);
    
    logger.info('Expectation store initialized', {
      event: 'STORE_INITIALIZED',
      count: expectations.size
    });
  } catch (error) {
    logger.error('Failed to initialize expectation store', {
      context: 'store_initialization',
      error: error.message,
      stack: error.stack
    });
    expectations = new Map();
    initializeIndices(expectations);
  }
}

/**
 * @param {Object} expectation - Expectation to add
 * @returns {Promise<string>} ID of the added expectation
 */
export async function addExpectation(expectation) {
  return lock.acquire('expectations', async () => {
    const id = expectation.id || uuidv4();
    const priority = expectation.priority !== undefined ? expectation.priority : 0;
    const newExpectation = { ...expectation, id, priority };

    if (expectations.has(id)) {
      logger.warn('Expectation with this ID already exists, generating new ID', {
        event: 'DUPLICATE_ID',
        oldId: id
      });
      return addExpectation({ ...expectation, id: uuidv4() });
    }

    expectations.set(id, newExpectation);
    indexExpectation(id, newExpectation);

    if (persistenceEnabled) {
      await saveToFile();
    }
    
    logger.info('Expectation created', {
      event: 'EXPECTATION_CREATED',
      id,
      method: newExpectation.httpRequest?.method,
      path: newExpectation.httpRequest?.path,
      priority
    });
    
    return id;
  });
}

/**
 * @param {string} id - Expectation ID
 * @returns {Object|undefined} Expectation if found
 */
export function getExpectation(id) {
  const expectation = expectations.get(id);
  if (expectation) {
    logger.debug('Expectation retrieved', {
      event: 'EXPECTATION_RETRIEVED',
      id
    });
  }
  return expectation;
}

/**
 * @returns {Array<Object>} Array of all expectations
 */
export function getAllExpectations() {
  const allExpectations = Array.from(expectations.values());
  logger.debug('Retrieved all expectations', {
    event: 'EXPECTATIONS_RETRIEVED',
    count: allExpectations.length
  });
  return allExpectations;
}

/**
 * @param {Object} [options] - Options for clearing expectations
 * @param {string} [options.id] - Clear expectation with specific ID
 * @param {Object} [options.request] - Clear expectations matching this request definition
 * @returns {Promise<void>}
 */
export async function clearExpectations(options = {}) {
  if (options.id) {
    await removeExpectation(options.id);
    return;
  }
  
  if (options.request) {
    const toRemove = [];
    
    expectations.forEach((expectation, id) => {
      let match = true;
      const req = options.request;
      
      if (req.method && expectation.httpRequest.method !== req.method) {
        match = false;
      }
      
      if (req.path && expectation.httpRequest.path !== req.path) {
        match = false;
      }
      
      if (match) {
        toRemove.push(id);
      }
    });
    
    logger.info('Clearing matching expectations', {
      event: 'EXPECTATIONS_CLEARING',
      matchCount: toRemove.length,
      criteria: options.request
    });
    
    for (const id of toRemove) {
      await removeExpectation(id);
    }
    
    return;
  }
  
  const count = expectations.size;
  expectations.clear();
  initializeIndices(expectations);

  
  if (persistenceEnabled) {
    await saveToFile();
  }
  
  logger.info('All expectations cleared', {
    event: 'EXPECTATIONS_CLEARED',
    count
  });
}

/**
 * @param {string} id - Expectation ID to remove
 * @returns {Promise<boolean>} True if removed, false if not found
 */
export async function removeExpectation(id) {
  return lock.acquire('expectations', async () => {
    const expectation = expectations.get(id);
    if (!expectation) {
      logger.debug('Expectation not found for removal', {
        event: 'EXPECTATION_REMOVE_FAILED',
        id
      });
      return false;
    }

    removeFromIndices(id, expectation);
    expectations.delete(id);

    if (persistenceEnabled) {
      await saveToFile();
    }
    
    logger.info('Expectation removed', {
      event: 'EXPECTATION_REMOVED',
      id,
      method: expectation.httpRequest?.method,
      path: expectation.httpRequest?.path
    });
    
    return true;
  });
}

/**
 * @param {Object} request - Request to match
 * @returns {Object|null} Matching expectation or null
 */
export function findExpectationForRequest(request) {
  return findMatchingExpectation(request, expectations);
}

/**
 * @returns {Promise<void>}
 */
async function saveToFile() {
  if (!persistenceEnabled) return;
  return lock.acquire('file', async () => {
    await saveExpectations(expectations, persistencePath);
  });
}

/**
 * @returns {Map<string, Object>} The expectations map
 */
export function getExpectationsMap() {
  return expectations;
}

/**
 * @param {Object} expectation - Expectation to upsert
 * @returns {Promise<Object>} Updated or created expectation
 */
export async function upsertExpectation(expectation) {
  let existingId = expectation.id;
  let updatedExpectation;

  
  const priority = expectation.priority !== undefined ? expectation.priority : 0;

  if (existingId && expectations.has(existingId)) {
    
    updatedExpectation = { ...expectation, priority };
    
    removeFromIndices(existingId, expectations.get(existingId));
    expectations.set(existingId, updatedExpectation);
    indexExpectation(existingId, updatedExpectation);
  } else {
    
    existingId = uuidv4();
    updatedExpectation = { ...expectation, id: existingId, priority };
    
    expectations.set(existingId, updatedExpectation);
    indexExpectation(existingId, updatedExpectation);
  }

  if (persistenceEnabled) {
    await saveToFile();
  }
  
  logger.info('Expectation created', {
    event: 'EXPECTATION_CREATED',
    id: existingId,
    method: updatedExpectation.httpRequest?.method,
    path: updatedExpectation.httpRequest?.path,
    priority: updatedExpectation.priority
  });
  
  return updatedExpectation;
} 
