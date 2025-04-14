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
export const matchString = (value, expected, { subString = false } = {}) => {
  if (!value || !expected) return false;
  
  const stringValue = String(value);
  const stringExpected = String(expected);
  
  return subString ? 
    stringValue.includes(stringExpected) : 
    stringValue === stringExpected;
}; 
