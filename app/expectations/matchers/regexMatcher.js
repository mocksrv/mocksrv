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
export const matchRegex = (value, pattern) => {
  if (!value || !pattern) return false;
  
  try {
    const regex = new RegExp(pattern);
    return regex.test(String(value));
  } catch {
    return false;
  }
}; 
