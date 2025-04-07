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
import {
  logExpectationCreated,
  logExpectationRemoved,
  logExpectationsCleared
} from '../utils/logger.js';

// In-memory store for expectations
let expectations = new Map();

/**
 * Initializes the expectation store
 * @returns {Promise<void>}
 */
export async function initializeStore() {
  try {
    expectations = await loadExpectations();
    initializeIndices(expectations);
  } catch (error) {
    console.error('Error initializing expectation store:', error);
    expectations = new Map();
    initializeIndices(expectations);
  }
}

/**
 * Adds a new expectation
 * @param {Object} expectation - Expectation to add
 * @returns {Promise<string>} ID of the added expectation
 */
export async function addExpectation(expectation) {
  const id = uuidv4();
  const priority = expectation.priority !== undefined ? expectation.priority : 0;
  const newExpectation = { ...expectation, id, priority };

  expectations.set(id, newExpectation);
  indexExpectation(id, newExpectation);

  await saveToFile();
  logExpectationCreated(newExpectation);
  return id;
}

/**
 * Gets a specific expectation by ID
 * @param {string} id - Expectation ID
 * @returns {Object|undefined} Expectation if found
 */
export function getExpectation(id) {
  return expectations.get(id);
}

/**
 * Gets all stored expectations
 * @returns {Array<Object>} Array of all expectations
 */
export function getAllExpectations() {
  return Array.from(expectations.values());
}

/**
 * Clears all expectations
 * @returns {Promise<void>}
 */
export async function clearExpectations() {
  expectations.clear();
  initializeIndices(expectations);

  await saveToFile();
  logExpectationsCleared();
}

/**
 * Removes a specific expectation
 * @param {string} id - Expectation ID to remove
 * @returns {Promise<boolean>} True if removed, false if not found
 */
export async function removeExpectation(id) {
  const expectation = expectations.get(id);
  if (!expectation) {
    return false;
  }

  removeFromIndices(id, expectation);
  expectations.delete(id);

  await saveToFile();
  logExpectationRemoved(id);
  return true;
}

/**
 * Finds a matching expectation for a request
 * @param {Object} request - Request to match
 * @returns {Object|null} Matching expectation or null
 */
export function findExpectationForRequest(request) {
  return findMatchingExpectation(request, expectations);
}

/**
 * Saves current expectations to file
 * @returns {Promise<void>}
 */
async function saveToFile() {
  await saveExpectations(expectations);
}

/**
 * For testing purposes only
 * @returns {Map<string, Object>} The expectations map
 */
export function getExpectationsMap() {
  return expectations;
} 