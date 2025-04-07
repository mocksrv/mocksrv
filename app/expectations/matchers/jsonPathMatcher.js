/**
 * JSONPath Matcher for evaluating JSONPath expressions
 * @module expectations/matchers/jsonPathMatcher
 */

import jsonpath from 'jsonpath';

/**
 * Matches JSON using JSONPath expression
 * @param {*} actual - Actual JSON value
 * @param {string} expression - JSONPath expression
 * @returns {boolean} True if matches
 */
export function matchJsonPath(actual, expression) {
  if (typeof actual === 'string') {
    try {
      actual = JSON.parse(actual);
    } catch (e) {
      return false;
    }
  }

  try {
    const result = jsonpath.query(actual, expression);
    return result.length > 0;
  } catch (e) {
    return false;
  }
} 
