/**
 * XPath Matcher for evaluating XPath expressions against XML
 * @module expectations/matchers/xpathMatcher
 */

import xpath from 'xpath';
import pkg from 'xmldom';
const { DOMParser } = pkg;


/**
 * Matches XML using XPath expression
 * @param {*} actual - Actual XML string
 * @param {string} expression - XPath expression
 * @returns {boolean} True if matches
 */
export function matchXPath(actual, expression) {
  if (typeof actual !== 'string') {
    try {
      actual = JSON.stringify(actual);
    } catch (e) {
      return false;
    }
  }

  if (!expression || typeof expression !== 'string') {
    return false;
  }

  try {
    
    const originalWarn = console.warn;
    const originalError = console.error;
    
    
    console.warn = function() {};
    console.error = function() {};
    
    try {
      
      const doc = new DOMParser({
        errorHandler: {
          warning: function() {},
          error: function() {},
          fatalError: function() {}
        },
        locator: {}
      }).parseFromString(actual);
      
      const nodes = xpath.select(expression, doc);
      return nodes.length > 0;
    } finally {
      
      console.warn = originalWarn;
      console.error = originalError;
    }
  } catch (e) {
    return false;
  }
} 
