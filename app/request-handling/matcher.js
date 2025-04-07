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

/**
 * Finds the matching expectation for the given request
 * @param {Object} request - The request to match
 * @param {Map<string, Object>} expectations - Map of expectations by ID
 * @returns {Object|null} Matching expectation or null
 */
export function findMatchingExpectation(request, expectations) {
  if (expectations.size === 0) {
    return null;
  }

  const candidateIds = getCandidateExpectationIds(request);
  if (candidateIds.size === 0) {
    return null;
  }

  const matchingCandidates = Array.from(candidateIds)
    .map(id => {
      const expectation = expectations.get(id);
      if (!expectation) return null;

      return {
        expectation,
        priority: expectation.priority || 0,
        matches: matchesExpectation(request, expectation)
      };
    })
    .filter(candidate => candidate && candidate.matches);

  if (matchingCandidates.length === 0) {
    return null;
  }

  matchingCandidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.expectation.id.localeCompare(a.expectation.id);
  });

  return matchingCandidates[0].expectation;
}

/**
 * Checks if a request matches an expectation
 * @param {Object} request - The request to check
 * @param {Object} expectation - The expectation to match against
 * @returns {boolean} True if request matches expectation
 */
export function matchesExpectation(request, expectation) {
  if (expectation.type !== 'http') {
    return false;
  }

  const { httpRequest } = expectation;
  const matchType = httpRequest.matchType || MatchType.STRICT;

  if (httpRequest.method) {
    const invertMethodMatch = httpRequest.method.not === true;
    const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;

    const methodMatches = request.method === methodValue;
    if (invertMethodMatch ? methodMatches : !methodMatches) {
      return false;
    }
  }

  if (httpRequest.path) {
    const invertPathMatch = httpRequest.path.not === true;
    const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;

    let pathMatches = false;

    if (pathValue.includes('*')) {
      const regexPattern = '^' + pathValue.replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexPattern);
      pathMatches = regex.test(request.path);
    } else {
      pathMatches = request.path === pathValue;
    }

    if (invertPathMatch ? pathMatches : !pathMatches) {
      return false;
    }
  }

  const queryParams = httpRequest.queryStringParameters || httpRequest.query;
  if (queryParams) {
    if (!matchesQuery(request.query, queryParams, matchType)) {
      return false;
    }
  } else if (matchType === MatchType.STRICT &&
    request.query &&
    Object.keys(request.query).length > 0) {
    return false;
  }

  if (httpRequest.headers) {
    if (!matchesHeaders(request.headers, httpRequest.headers, matchType)) {
      return false;
    }
  } else if (matchType === MatchType.STRICT &&
    request.headers &&
    !containsOnlyStandardHeaders(request.headers)) {
    return false;
  }

  if (httpRequest.body) {
    if (!matchesBody(request.body, httpRequest.body, matchType)) {
      return false;
    }
  } else if (matchType === MatchType.STRICT &&
    request.body &&
    Object.keys(request.body).length > 0 &&
    request.headers['content-type']?.includes('application/json')) {
    return false;
  }

  return true;
}

/**
 * Checks if headers object contains only standard headers
 * @param {Object} headers - Headers object
 * @returns {boolean} True if only standard headers
 */
function containsOnlyStandardHeaders(headers) {
  const standardHeaders = ['host', 'connection', 'content-length', 'user-agent', 'accept', 'accept-encoding', 'content-type'];

  for (const header of Object.keys(headers)) {
    if (!standardHeaders.includes(header.toLowerCase())) {
      return false;
    }
  }

  return true;
}

/**
 * Matches query parameters
 * @param {Object} requestQuery - Request query parameters
 * @param {Object} expectedQuery - Expected query parameters
 * @param {string} matchType - Match type (strict or onlyMatchingFields)
 * @returns {boolean} True if matches
 */
export function matchesQuery(requestQuery, expectedQuery, matchType) {
  const invertMatch = expectedQuery.not === true;

  const expectedQueryToMatch = { ...expectedQuery };
  delete expectedQueryToMatch.not;

  if (matchType === MatchType.STRICT) {
    const expectedKeys = Object.keys(expectedQueryToMatch);
    const requestKeys = Object.keys(requestQuery);

    if (expectedKeys.length !== requestKeys.length && !invertMatch) {
      return false;
    }
  }

  const result = Object.entries(expectedQueryToMatch).every(([key, value]) => {
    if (Array.isArray(value) && Array.isArray(requestQuery[key])) {
      return value.length === requestQuery[key].length &&
        value.every(v => requestQuery[key].includes(v));
    }
    return requestQuery[key] === value;
  });

  return invertMatch ? !result : result;
}

/**
 * Matches headers
 * @param {Object} requestHeaders - Request headers
 * @param {Object} expectedHeaders - Expected headers
 * @param {string} matchType - Match type (strict or onlyMatchingFields)
 * @returns {boolean} True if matches
 */
export function matchesHeaders(requestHeaders, expectedHeaders, matchType) {
  const invertMatch = expectedHeaders.not === true;

  const expectedHeadersToMatch = { ...expectedHeaders };
  delete expectedHeadersToMatch.not;

  if (matchType === MatchType.STRICT) {
    const standardHeaders = ['host', 'connection', 'content-length', 'user-agent', 'accept', 'accept-encoding', 'content-type'];

    const filteredRequestHeaders = Object.keys(requestHeaders)
      .filter(h => !standardHeaders.includes(h.toLowerCase()));

    const filteredExpectedHeaders = Object.keys(expectedHeadersToMatch)
      .filter(h => !standardHeaders.includes(h.toLowerCase()));

    if (filteredRequestHeaders.length !== filteredExpectedHeaders.length && !invertMatch) {
      return false;
    }
  }

  const result = Object.entries(expectedHeadersToMatch).every(([key, value]) => {
    const headerKey = key.toLowerCase();
    return requestHeaders[headerKey] === value;
  });

  return invertMatch ? !result : result;
}

/**
 * Matches body
 * @param {*} requestBody - Request body
 * @param {Object} expectedBody - Expected body configuration
 * @param {string} matchType - Match type (strict or onlyMatchingFields)
 * @returns {boolean} True if matches
 */
export function matchesBody(requestBody, expectedBody, matchType) {
  if (!requestBody || !expectedBody) {
    return false;
  }

  const invertMatch = expectedBody.not === true;

  const { type } = expectedBody;
  const expectedValue = expectedBody.value ||
    expectedBody.json ||
    expectedBody.string ||
    expectedBody.jsonPath ||
    expectedBody.xpath ||
    expectedBody.regex;

  if (!expectedValue) {
    return false;
  }

  if (matchType === MatchType.STRICT &&
    type === BodyMatcherType.JSON &&
    typeof requestBody === 'object' &&
    typeof expectedValue === 'object') {

    const requestBodyKeys = Object.keys(requestBody);
    const expectedBodyKeys = Object.keys(expectedValue).filter(key => key !== 'not');

    if (requestBodyKeys.length !== expectedBodyKeys.length && !invertMatch) {
      return false;
    }
  }

  if (matchType === MatchType.ONLY_MATCHING_FIELDS &&
    type === BodyMatcherType.JSON &&
    typeof requestBody === 'object' &&
    typeof expectedValue === 'object') {

    const result = Object.entries(expectedValue).every(([key, value]) =>
      requestBody[key] !== undefined &&
      JSON.stringify(requestBody[key]) === JSON.stringify(value)
    );

    return invertMatch ? !result : result;
  }

  let result = false;

  try {
    switch (type) {
      case BodyMatcherType.JSON:
        result = matchJson(requestBody, expectedValue, matchType === MatchType.STRICT);
        break;
      case BodyMatcherType.JSON_PATH:
        result = matchJsonPath(requestBody, expectedValue);
        break;
      case BodyMatcherType.XPATH:
        result = matchXPath(requestBody, expectedValue);
        break;
      case BodyMatcherType.REGEX:
        result = matchRegex(requestBody, expectedValue);
        break;
      case BodyMatcherType.STRING:
        result = matchString(requestBody, expectedValue);
        break;
      default:
        result = false;
    }
  } catch (error) {
    console.error('Error matching body:', error);
    result = false;
  }

  return invertMatch ? !result : result;
} 
