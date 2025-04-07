/**
 * Regex Matcher for matching strings against regular expressions
 * @module expectations/matchers/regexMatcher
 */

/**
 * Matches a string against a regular expression
 * @param {*} actual - Actual value (will be converted to string if not a string)
 * @param {string} pattern - Regular expression pattern
 * @returns {boolean} True if matches
 */
export function matchRegex(actual, pattern) {
  if (typeof actual !== 'string') {
    // Try to stringify non-string values
    try {
      actual = JSON.stringify(actual);
    } catch (e) {
      return false;
    }
  }

  try {
    const regex = new RegExp(pattern);
    return regex.test(actual);
  } catch (e) {
    return false;
  }
} 