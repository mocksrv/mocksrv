/**
 * Main matcher for HTTP requests against expectations
 * @module request-handling/matcher
 */

import { BodyMatcherType, MatchType } from '../expectations/types.js';
import { getCandidateExpectationIds } from '../expectations/indexers/indexer.js';
import { matchJson } from '../expectations/matchers/jsonMatcher.js';
import { matchJsonPath } from '../expectations/matchers/jsonPathMatcher.js';
import { matchXPath } from '../expectations/matchers/xpathMatcher.js';
import { matchRegex } from '../expectations/matchers/regexMatcher.js';
import { matchString } from '../expectations/matchers/stringMatcher.js';
import { matchMultiValue } from '../expectations/matchers/multiValueMatcher.js';

/**
 * @param {Object} request - The request to match
 * @param {Map<string, Object>} expectations - Map of expectations by ID
 * @returns {Object|null} Matching expectation or null
 */
export const findMatchingExpectation = (request, expectations) => {
  if (expectations.size === 0) return null;

  const candidateIds = getCandidateExpectationIds(request);
  if (candidateIds.size === 0) return null;

  const regularCandidates = [];
  const forwardCandidates = [];

  Array.from(candidateIds).forEach(id => {
    const expectation = expectations.get(id);
    if (!expectation) return;
    
    const matches = matchesExpectation(request, expectation);

    if (matches) {
      const candidateInfo = {
        expectation,
        priority: expectation.priority || 0
      };

      if (expectation.httpForward) {
        forwardCandidates.push(candidateInfo);
      } else if (expectation.httpResponse) {
        regularCandidates.push(candidateInfo);
      }
    }
  });

  if (regularCandidates.length > 0) {
    regularCandidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.expectation.id.localeCompare(a.expectation.id);
    });
    
    return regularCandidates[0].expectation;
  }

  if (forwardCandidates.length > 0) {
    forwardCandidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.expectation.id.localeCompare(a.expectation.id);
    });
    
    return forwardCandidates[0].expectation;
  }

  return null;
};

/**
 * Checks if a request matches an expectation
 * @param {Object} request - The request to check
 * @param {Object} expectation - The expectation to match against
 * @returns {boolean} True if request matches expectation
 */
export const matchesExpectation = (request, expectation) => {
  const isForwardExpectation = !!expectation.httpForward;

  if (isForwardExpectation) {
    const { httpRequest } = expectation;
    
    if (httpRequest.method) {
      const methodValue = typeof httpRequest.method === 'object' ? 
        (httpRequest.method.string || httpRequest.method.value) : 
        httpRequest.method;
      const isNot = httpRequest.method.not === true;
      
      const methodMatches = matchRegex(request.method, methodValue) || 
                          matchString(request.method, methodValue);
                          
      if (isNot ? methodMatches : !methodMatches) return false;
    }

    if (httpRequest.path) {
      const pathValue = typeof httpRequest.path === 'object' ? 
        (httpRequest.path.string || httpRequest.path.value) : 
        httpRequest.path;
      const isNot = httpRequest.path.not === true;
      
      const pathMatches = matchRegex(request.path, pathValue);
      if (isNot ? pathMatches : !pathMatches) {
        return false;
      }
    }

    return true;
  }

  const isHttpExpectation = !!expectation.httpResponse;
  if (!isHttpExpectation) return false;

  const { httpRequest } = expectation;
  const matchType = httpRequest.matchType || MatchType.ONLY_MATCHING_FIELDS;

  if (httpRequest.method) {
    const methodValue = typeof httpRequest.method === 'object' ? 
      (httpRequest.method.string || httpRequest.method.value) : 
      httpRequest.method;
    const isNot = httpRequest.method.not === true;
    
    const methodMatches = matchRegex(request.method, methodValue) || 
                         matchString(request.method, methodValue);
                             
    if (isNot ? methodMatches : !methodMatches) return false;
  }

  if (httpRequest.path) {
    const pathValue = typeof httpRequest.path === 'object' ? 
      (httpRequest.path.string || httpRequest.path.value) : 
      httpRequest.path;
    const isNot = httpRequest.path.not === true;
    
    let requestPath = request.path;
    if (requestPath.includes('?')) {
      requestPath = requestPath.split('?')[0];
    }
    
    const pathMatches = matchRegex(requestPath, pathValue) || 
                       matchString(requestPath, pathValue);
                           
    if (isNot ? pathMatches : !pathMatches) {
      return false;
    }
  }

  const queryParams = httpRequest.queryStringParameters || httpRequest.query;
  if (queryParams) {
    const isNot = queryParams.not === true;
    const matches = matchMultiValue(request.query, queryParams, { matchType });

    if (isNot ? matches : !matches) {
      return false;
    }
  } else if (matchType === MatchType.STRICT && 
             request.query && 
             Object.keys(request.query).length > 0) {
  }

  if (httpRequest.headers) {
    const isNot = httpRequest.headers.not === true;
    const matches = matchMultiValue(request.headers, httpRequest.headers, { matchType });

    if (isNot ? matches : !matches) {
      return false;
    }
  }

  if (httpRequest.body) {
    const matches = matchBody(request.body, httpRequest.body, matchType);
    if (!matches) {
      return false;
    }
  } else if (matchType === MatchType.STRICT && 
             request.body && 
             Object.keys(request.body).length > 0 && 
             request.headers['content-type']?.includes('application/json')) {
    return false;
  }

  return true;
};


/**
 * Matches body
 * @param {*} requestBody - Request body
 * @param {Object} expectedBody - Expected body configuration
 * @param {string} matchType - Match type (strict or onlyMatchingFields)
 * @returns {boolean} True if matches
 */
const matchBody = (actual, expected, matchType) => {
  if (!actual || !expected) return false;

  const { type = BodyMatcherType.STRING, value, matchType: bodyMatchType = matchType } = expected;

  switch (type) {
    case BodyMatcherType.REGEX:
      return matchRegex(actual, value);
    case BodyMatcherType.JSON:
      return matchJson(actual, value, { matchType: bodyMatchType });
    case BodyMatcherType.JSON_PATH:
      return matchJsonPath(actual, value);
    case BodyMatcherType.XPATH:
      return matchXPath(actual, value);
    case BodyMatcherType.STRING:
    default:
      return matchString(actual, value);
  }
};

