/**
 * XPath Matcher for evaluating XPath expressions against XML
 * @module expectations/matchers/xpathMatcher
 */

import xpath from 'xpath';
import { DOMParser } from 'xmldom';

/**
 * Matches XML using XPath expression
 * @param {*} actual - Actual XML string
 * @param {string} expression - XPath expression
 * @returns {boolean} True if matches
 */
export function matchXPath(actual, expression) {
  if (typeof actual !== 'string') {
    // Try to stringify non-string values
    try {
      actual = JSON.stringify(actual);
    } catch (e) {
      return false;
    }
  }

  try {
    const doc = new DOMParser().parseFromString(actual);
    const nodes = xpath.select(expression, doc);
    return nodes.length > 0;
  } catch (e) {
    return false;
  }
} 