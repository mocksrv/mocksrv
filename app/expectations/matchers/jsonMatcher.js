/**
 * JSON Matcher for comparing JSON values
 * @module expectations/matchers/jsonMatcher
 */

import { JsonUnitPlaceholder } from '../types.js';

/**
 * Matches JSON body with expected value
 * @param {*} actual - Actual JSON value
 * @param {*} expected - Expected JSON value
 * @param {boolean} [exactMatch=true] - Whether to require exact match
 * @returns {boolean} True if matches
 */
export function matchJson(actual, expected, exactMatch = true) {
  if (typeof actual === 'string') {
    try {
      actual = JSON.parse(actual);
    } catch (e) {
      return false;
    }
  }

  return exactMatch ?
    deepEquals(actual, expected) :
    deepContains(actual, expected);
}

/**
 * Deep equality check with support for JSON Unit placeholders
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @returns {boolean} True if equal
 */
export function deepEquals(actual, expected) {
  if (typeof expected === 'string' && expected.startsWith('${json-unit')) {
    return matchJsonUnitPlaceholder(actual, expected);
  }

  // Ensure type equality
  if (typeof actual !== typeof expected) {
    return false;
  }

  // Check for arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return false;
    }

    for (let i = 0; i < actual.length; i++) {
      if (!deepEquals(actual[i], expected[i])) {
        return false;
      }
    }

    return true;
  }

  // Check objects
  if (typeof actual === 'object' && actual !== null && expected !== null) {
    // Ensure both are objects or both are arrays
    if (Array.isArray(actual) !== Array.isArray(expected)) {
      return false;
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }

    for (const key of expectedKeys) {
      if (!actual.hasOwnProperty(key) || !deepEquals(actual[key], expected[key])) {
        return false;
      }
    }

    return true;
  }

  return actual === expected;
}

/**
 * Checks if actual object contains all expected properties
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @returns {boolean} True if actual contains expected
 */
export function deepContains(actual, expected) {
  if (typeof expected === 'string' && expected.startsWith('${json-unit')) {
    return matchJsonUnitPlaceholder(actual, expected);
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return false;
    }

    for (const expectedItem of expected) {
      if (!actual.some(actualItem => deepContains(actualItem, expectedItem))) {
        return false;
      }
    }

    return true;
  }

  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null) {
      return false;
    }

    for (const [key, value] of Object.entries(expected)) {
      if (!actual.hasOwnProperty(key) || !deepContains(actual[key], value)) {
        return false;
      }
    }

    return true;
  }

  return actual === expected;
}

/**
 * Matches a JSON Unit placeholder
 * @param {*} actual - Actual value
 * @param {string} placeholder - JSON Unit placeholder
 * @returns {boolean} True if matches
 */
export function matchJsonUnitPlaceholder(actual, placeholder) {
  switch (placeholder) {
    case JsonUnitPlaceholder.IGNORE:
      return true;
    case JsonUnitPlaceholder.ANY_STRING:
      return typeof actual === 'string';
    case JsonUnitPlaceholder.ANY_NUMBER:
      return typeof actual === 'number';
    case JsonUnitPlaceholder.ANY_BOOLEAN:
      return typeof actual === 'boolean';
    case JsonUnitPlaceholder.ANY_OBJECT:
      return typeof actual === 'object' && actual !== null && !Array.isArray(actual);
    case JsonUnitPlaceholder.ANY_ARRAY:
      return Array.isArray(actual);
    default:
      return false;
  }
} 
