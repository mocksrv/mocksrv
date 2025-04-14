import { matchRegex } from './regexMatcher.js';
import { matchString } from './stringMatcher.js';

/**
 * Matches a multi-value object
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {Object} options - Options object
 * @param {string} [options.matchType='STRICT'] - Match type
 * @returns {boolean} True if matches
 */
export const matchMultiValue = (actual, expected, { matchType = 'STRICT' } = {}) => {
  if (!actual || !expected) return false;
  
  const actualEntries = Object.entries(actual);
  const expectedEntries = Object.entries(expected);
  
  if (matchType === 'STRICT' && actualEntries.length !== expectedEntries.length) {
    return false;
  }
  
  return expectedEntries.every(([key, value]) => {
    const actualValue = actual[key];
    if (!actualValue) return false;

    if (Array.isArray(value)) {
      if (!Array.isArray(actualValue)) return false;
      if (matchType === 'STRICT' && value.length !== actualValue.length) return false;
      
      return value.every((expectedItem, index) => {
        const actualItem = actualValue[index];
        return matchRegex(actualItem, expectedItem) || matchString(actualItem, expectedItem);
      });
    }
    
    return matchRegex(actualValue, value) || matchString(actualValue, value);
  });
}; 