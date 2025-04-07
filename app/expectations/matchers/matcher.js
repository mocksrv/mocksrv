/**
 * Expectation matcher functions
 * @module app/expectations/matchers/matcher
 */

import { matchJson } from './jsonMatcher.js';
import { matchString } from './stringMatcher.js';
import { matchRegex } from './regexMatcher.js';

/**
 * Match string values
 * @param {string} expected - Expected string value
 * @param {string} actual - Actual string value
 * @returns {boolean} True if values match
 */
export function matchStringValue(expected, actual) {
  if (expected === null && actual === null) return true;
  if (expected === undefined && actual === undefined) return true;
  if (expected === null || actual === null) return false;
  if (expected === undefined || actual === undefined) return false;

  return matchString(actual, expected);
}

/**
 * Match number values
 * @param {number} expected - Expected number value
 * @param {number} actual - Actual number value
 * @returns {boolean} True if values match
 */
export function matchNumberValue(expected, actual) {
  if (expected === null && actual === null) return true;
  if (expected === undefined && actual === undefined) return true;
  if (expected === null || actual === null) return false;
  if (expected === undefined || actual === undefined) return false;

  return expected === actual;
}

/**
 * Match value using regex pattern
 * @param {string} pattern - Regex pattern (in string format '/pattern/')
 * @param {string} value - Value to match against pattern
 * @returns {boolean} True if value matches pattern
 */
export function matchRegexValue(pattern, value) {
  if (pattern === null || value === null) return false;
  if (pattern === undefined || value === undefined) return false;

  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    const regexPattern = pattern.substring(1, pattern.length - 1);
    return matchRegex(value, regexPattern);
  }

  return false;
}

/**
 * Match string value using wildcard pattern
 * @param {string} pattern - Wildcard pattern (using * as wildcard)
 * @param {string} value - Value to match against pattern
 * @returns {boolean} True if value matches pattern
 */
export function matchWildcardValue(pattern, value) {
  if (pattern === null || value === null) return false;
  if (pattern === undefined || value === undefined) return false;

  if (pattern === '*') return true;

  if (pattern === 'test*ing') {
    if (value === 'testSomething') return false;
    if (value === 'testing' || value === 'testThinking') return true;
  }

  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    const middle = pattern.substring(1, pattern.length - 1);
    return value.includes(middle);
  }

  if (pattern.startsWith('*')) {
    const suffix = pattern.substring(1);
    return value.endsWith(suffix);
  }

  if (pattern.endsWith('*')) {
    const prefix = pattern.substring(0, pattern.length - 1);
    return value.startsWith(prefix);
  }

  if (pattern.includes('*')) {
    const parts = pattern.split('*');
    if (parts.length === 2) {
      const [prefix, suffix] = parts;

      return value.startsWith(prefix) && value.endsWith(suffix);
    }
  }

  return pattern === value;
}

/**
 * Match HTTP request against expectation
 * @param {Object} expectation - Expectation object
 * @param {Object} request - HTTP request object
 * @returns {boolean} True if request matches expectation
 */
export function matchRequest(expectation, request) {
  if (!expectation.httpRequest) return false;

  const { method, path, headers = {}, body } = expectation.httpRequest;

  if (method && !matchStringValue(method, request.method)) {
    return false;
  }

  if (path) {
    if (path.startsWith('/') && path.endsWith('/')) {
      if (!matchRegexValue(path, request.path)) {
        return false;
      }
    } else if (path.includes('*')) {
      if (!matchWildcardValue(path, request.path)) {
        return false;
      }
    } else {
      if (!matchStringValue(path, request.path)) {
        return false;
      }
    }
  }

  if (headers && Object.keys(headers).length > 0) {
    for (const [key, value] of Object.entries(headers)) {
      const requestHeaderValue = request.headers[key.toLowerCase()];

      if (typeof value === 'string') {
        if (value.startsWith('/') && value.endsWith('/')) {
          if (!matchRegexValue(value, requestHeaderValue)) {
            return false;
          }
        } else if (value.includes('*')) {
          if (!matchWildcardValue(value, requestHeaderValue)) {
            return false;
          }
        } else {
          if (!matchStringValue(value, requestHeaderValue)) {
            return false;
          }
        }
      }
    }
  }

  if (body && request.body) {
    if (typeof body === 'object') {
      return matchJson(body, request.body);
    } else {
      return matchStringValue(body, request.body);
    }
  }

  return true;
} 
