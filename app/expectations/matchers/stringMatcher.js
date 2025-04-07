/**
 * String Matcher for exact string matching
 * @module expectations/matchers/stringMatcher
 */

/**
 * Matches strings exactly
 * @param {*} actual - Actual value (will be converted to string if not a string)
 * @param {string} expected - Expected string value
 * @returns {boolean} True if matches
 */
export function matchString(actual, expected) {
  if (typeof actual !== 'string') {
    // Try to stringify non-string values
    try {
      actual = JSON.stringify(actual);
    } catch (e) {
      return false;
    }
  }

  return actual === expected;
} 