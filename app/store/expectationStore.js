import {
  logExpectationCreated,
  logExpectationRemoved,
  logExpectationsCleared
} from '../utils/logger.js';
import { loadExpectations, saveExpectations } from './persistence.js';
import { BodyMatcherType, MatchType, JsonUnitPlaceholder } from '../types/expectation.js';
import jsonpath from 'jsonpath';
import xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { v4 as uuidv4 } from 'uuid';

let expectations = new Map();

let methodIndex = new Map();
let pathIndex = new Map();
let wildcardExpectations = new Set();

/**
 * Gets the base path segment from a given path
 * @param {string} path - The path to extract the base segment from
 * @returns {string|null} The base path segment or null if path is invalid
 */
function getBasePathSegment(path) {
  if (!path) return null;

  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const firstSegment = cleanPath.split('/')[0];

  return '/' + firstSegment;
}

/**
 * Initializes the expectation store by loading saved expectations
 * @returns {Promise<void>}
 */
export async function initializeStore() {
  expectations = await loadExpectations();
  initializeIndices();
}

/**
 * Initializes indices for faster expectation lookup
 */
function initializeIndices() {
  methodIndex = new Map();
  pathIndex = new Map();
  wildcardExpectations = new Set();

  for (const [id, expectation] of expectations.entries()) {
    indexExpectation(id, expectation);
  }
}

/**
 * Indexes a single expectation for faster lookup
 * @param {string} id - The expectation ID
 * @param {Object} expectation - The expectation object to index
 */
function indexExpectation(id, expectation) {
  if (expectation.type !== 'http') return;

  const { httpRequest } = expectation;

  if (httpRequest.method) {
    const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;
    if (!methodIndex.has(methodValue)) {
      methodIndex.set(methodValue, new Set());
    }
    methodIndex.get(methodValue).add(id);
  }

  if (httpRequest.path) {
    const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;

    if (pathValue.includes('*')) {
      wildcardExpectations.add(id);
    } else {
      const baseSegment = getBasePathSegment(pathValue);
      if (baseSegment) {
        if (!pathIndex.has(baseSegment)) {
          pathIndex.set(baseSegment, new Set());
        }
        pathIndex.get(baseSegment).add(id);
      }
    }
  }
}

/**
 * Removes an expectation from all indices
 * @param {string} id - The expectation ID to remove
 * @param {Object} expectation - The expectation object to remove from indices
 */
function removeFromIndices(id, expectation) {
  if (expectation.type !== 'http') return;

  const { httpRequest } = expectation;

  if (httpRequest.method) {
    const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;
    if (methodIndex.has(methodValue)) {
      methodIndex.get(methodValue).delete(id);
    }
  }

  if (httpRequest.path) {
    const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;

    if (pathValue.includes('*')) {
      wildcardExpectations.delete(id);
    } else {
      const baseSegment = getBasePathSegment(pathValue);
      if (baseSegment && pathIndex.has(baseSegment)) {
        pathIndex.get(baseSegment).delete(id);
      }
    }
  }
}

/**
 * Saves current expectations to persistent storage
 * @returns {Promise<void>}
 */
async function saveToFile() {
  await saveExpectations(expectations);
}

/**
 * Adds a new expectation to the store
 * @param {Object} expectation - The expectation object to add
 * @returns {Promise<string>} The ID of the newly added expectation
 */
export async function addExpectation(expectation) {
  const id = uuidv4();
  const priority = expectation.priority !== undefined ? expectation.priority : 0;
  expectations.set(id, { ...expectation, id, priority });

  indexExpectation(id, expectations.get(id));

  await saveToFile();
  logExpectationCreated(expectations.get(id));
  return id;
}

/**
 * Retrieves an expectation by its ID
 * @param {string} id - The expectation ID
 * @returns {Object|undefined} The expectation object if found
 */
export function getExpectation(id) {
  return expectations.get(id);
}

/**
 * Gets all stored expectations
 * @returns {Array} Array of all expectation objects
 */
export function getAllExpectations() {
  return Array.from(expectations.values());
}

/**
 * Clears all stored expectations
 * @returns {Promise<void>}
 */
export async function clearExpectations() {
  expectations.clear();

  methodIndex.clear();
  pathIndex.clear();
  wildcardExpectations.clear();

  await saveToFile();
  logExpectationsCleared();
}

/**
 * Removes a specific expectation from the store
 * @param {string} id - The ID of the expectation to remove
 * @returns {Promise<boolean>} True if expectation was removed, false if not found
 */
export async function removeExpectation(id) {
  const expectation = expectations.get(id);
  if (expectation) {
    removeFromIndices(id, expectation);

    expectations.delete(id);
    await saveToFile();
    logExpectationRemoved(id);
    return true;
  }
  return false;
}

/**
 * Finds a matching expectation for a given request
 * @param {Object} request - The request to match against
 * @returns {Object|null} The matching expectation or null if none found
 */
export function findMatchingExpectation(request) {
  const candidateIds = getCandidateExpectationIds(request);

  if (candidateIds.size === 0) {
    return null;
  }

  const matchingExpectations = Array.from(candidateIds)
    .map(id => expectations.get(id))
    .filter(expectation => expectation && matchesExpectation(request, expectation));

  if (matchingExpectations.length === 0) {
    return null;
  }

  matchingExpectations.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return b.id.localeCompare(a.id);
  });

  return matchingExpectations[0];
}

/**
 * Gets candidate expectation IDs that might match the request
 * @param {Object} request - The request to find candidates for
 * @returns {Set<string>} Set of candidate expectation IDs
 */
function getCandidateExpectationIds(request) {
  const candidates = new Set();

  if (methodIndex.has(request.method)) {
    const methodCandidates = methodIndex.get(request.method);
    methodCandidates.forEach(id => candidates.add(id));
  }

  const baseSegment = getBasePathSegment(request.path);
  if (baseSegment && pathIndex.has(baseSegment)) {
    const pathCandidates = pathIndex.get(baseSegment);
    pathCandidates.forEach(id => candidates.add(id));
  }

  wildcardExpectations.forEach(id => candidates.add(id));

  if (expectations.size < 10) {
    expectations.forEach((_, id) => candidates.add(id));
  }

  return candidates;
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
    if (matchType === MatchType.STRICT) {
      const expectationQueryKeys = Object.keys(queryParams).filter(key => key !== 'not');

      if (Object.keys(request.query).length !== expectationQueryKeys.length && !queryParams.not) {
        return false;
      }
    }

    if (matchType === MatchType.ONLY_MATCHING_FIELDS) {
      const expectationQueryToMatch = { ...queryParams };
      delete expectationQueryToMatch.not;

      const allParamsMatch = Object.entries(expectationQueryToMatch).every(([key, value]) => {
        if (Array.isArray(value) && Array.isArray(request.query[key])) {
          return value.every(v => request.query[key].includes(v));
        }
        return request.query[key] === value;
      });

      if (!allParamsMatch) {
        return false;
      }
    } else {
      if (!matchesQuery(request.query, queryParams)) {
        return false;
      }
    }
  }

  if (httpRequest.headers) {
    if (matchType === MatchType.STRICT) {
      const standardHeaders = ['host', 'connection', 'content-length', 'user-agent', 'accept', 'accept-encoding', 'content-type'];
      const requestHeaderKeys = Object.keys(request.headers).filter(header => !standardHeaders.includes(header.toLowerCase()));

      const expectationHeaderKeys = Object.keys(httpRequest.headers).filter(header =>
        header !== 'not' && !standardHeaders.includes(header.toLowerCase()));

      if (requestHeaderKeys.length !== expectationHeaderKeys.length && !httpRequest.headers.not) {
        return false;
      }
    }

    if (!matchesHeaders(request.headers, httpRequest.headers)) {
      return false;
    }
  }

  if (httpRequest.body) {
    if (matchType === MatchType.STRICT && typeof request.body === 'object' &&
      typeof httpRequest.body.value === 'object' &&
      httpRequest.body.type === BodyMatcherType.JSON) {

      const requestBodyKeys = Object.keys(request.body);
      const expectationBodyKeys = Object.keys(httpRequest.body.value).filter(key => key !== 'not');

      if (requestBodyKeys.length !== expectationBodyKeys.length && !httpRequest.body.not) {
        return false;
      }
    }

    if (matchType === MatchType.ONLY_MATCHING_FIELDS) {
      if (!request.body) {
        return false;
      }

      if (httpRequest.body.type === BodyMatcherType.JSON && typeof request.body === 'object') {
        const expectationBodyValue = httpRequest.body.value;

        if (!expectationBodyValue) {
          return false;
        }

        const allFieldsMatch = Object.entries(expectationBodyValue).every(([key, value]) => {
          return request.body[key] !== undefined &&
            JSON.stringify(request.body[key]) === JSON.stringify(value);
        });

        return allFieldsMatch;
      }
    }

    if (!matchesBody(request.body, httpRequest.body)) {
      return false;
    }
  } else if (matchType === MatchType.STRICT && request.body &&
    Object.keys(request.body).length > 0 &&
    request.headers['content-type']?.includes('application/json')) {
    return false;
  }

  return true;
}

/**
 * Checks if request query parameters match expectation query parameters
 * @param {Object} requestQuery - The request query parameters
 * @param {Object} expectationQuery - The expectation query parameters
 * @returns {boolean} True if query parameters match
 */
function matchesQuery(requestQuery, expectationQuery) {
  const invertMatch = expectationQuery.not === true;

  const expectationQueryToMatch = { ...expectationQuery };
  delete expectationQueryToMatch.not;

  const result = Object.entries(expectationQueryToMatch).every(([key, value]) => {
    if (Array.isArray(value) && Array.isArray(requestQuery[key])) {
      return value.length === requestQuery[key].length &&
        value.every(v => requestQuery[key].includes(v));
    }
    return requestQuery[key] === value;
  });

  return invertMatch ? !result : result;
}

/**
 * Checks if request headers match expectation headers
 * @param {Object} requestHeaders - The request headers
 * @param {Object} expectationHeaders - The expectation headers
 * @returns {boolean} True if headers match
 */
function matchesHeaders(requestHeaders, expectationHeaders) {
  const invertMatch = expectationHeaders.not === true;

  const expectationHeadersToMatch = { ...expectationHeaders };
  delete expectationHeadersToMatch.not;

  const result = Object.entries(expectationHeadersToMatch).every(([key, value]) => {
    const headerKey = key.toLowerCase();
    return requestHeaders[headerKey] === value;
  });

  return invertMatch ? !result : result;
}

/**
 * Checks if request body matches expectation body
 * @param {*} requestBody - The request body
 * @param {Object} expectationBody - The expectation body configuration
 * @returns {boolean} True if bodies match
 */
function matchesBody(requestBody, expectationBody) {
  if (!requestBody || !expectationBody) {
    return false;
  }

  const invertMatch = expectationBody.not === true;

  const { type } = expectationBody;
  const expectedValue = expectationBody.value ||
    expectationBody.json ||
    expectationBody.string ||
    expectationBody.jsonPath ||
    expectationBody.xpath ||
    expectationBody.regex;

  if (!expectedValue) {
    return false;
  }

  let result = false;
  try {
    switch (type) {
      case BodyMatcherType.JSON:
        const containsPlaceholders = typeof expectedValue === 'object' &&
          JSON.stringify(expectedValue).includes('${json-unit.');

        if (containsPlaceholders) {
          result = matchesJsonWithUnit(requestBody, expectedValue);
        } else {
          result = JSON.stringify(requestBody) === JSON.stringify(expectedValue);
        }
        break;

      case BodyMatcherType.JSON_PATH:
        const jsonPathResults = jsonpath.query(requestBody, expectedValue);
        result = jsonPathResults.length > 0;
        break;

      case BodyMatcherType.XPATH:
        if (typeof requestBody !== 'string') {
          requestBody = JSON.stringify(requestBody);
        }
        try {
          const doc = new DOMParser().parseFromString(requestBody);
          const nodes = xpath.select(expectedValue, doc);
          result = nodes.length > 0;
        } catch (xmlError) {
          console.error('Error parsing XML:', xmlError);
          result = false;
        }
        break;

      case BodyMatcherType.REGEX:
        let regex;
        try {
          regex = new RegExp(expectedValue);
          const stringToMatch = typeof requestBody === 'object'
            ? JSON.stringify(requestBody)
            : String(requestBody);
          result = regex.test(stringToMatch);
        } catch (regexError) {
          console.error('Invalid regex pattern:', regexError);
          result = false;
        }
        break;

      case BodyMatcherType.STRING:
        const requestString = typeof requestBody === 'object'
          ? JSON.stringify(requestBody)
          : String(requestBody);
        result = requestString === expectedValue;
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

/**
 * Checks if JSON values match considering JSON Unit placeholders
 * @param {*} requestBody - The actual JSON value
 * @param {*} expectedBody - The expected JSON value with possible placeholders
 * @returns {boolean} True if values match
 */
function matchesJsonWithUnit(requestBody, expectedBody) {
  if (typeof expectedBody !== 'object' || expectedBody === null) {
    return matchesJsonUnitValue(requestBody, expectedBody);
  }

  if (Array.isArray(expectedBody)) {
    if (!Array.isArray(requestBody) || requestBody.length !== expectedBody.length) {
      return false;
    }

    return expectedBody.every((expectedItem, index) =>
      matchesJsonWithUnit(requestBody[index], expectedItem)
    );
  }

  if (typeof requestBody !== 'object' || requestBody === null) {
    return false;
  }

  return Object.entries(expectedBody).every(([key, expectedValue]) => {
    if (!(key in requestBody) && expectedValue !== JsonUnitPlaceholder.IGNORE) {
      return false;
    }

    if (expectedValue === JsonUnitPlaceholder.IGNORE) {
      return true;
    }

    return matchesJsonWithUnit(requestBody[key], expectedValue);
  });
}

/**
 * Checks if a single JSON value matches a JSON Unit placeholder or exact value
 * @param {*} actualValue - The actual value to check
 * @param {*} expectedValue - The expected value or placeholder
 * @returns {boolean} True if values match
 */
function matchesJsonUnitValue(actualValue, expectedValue) {
  if (expectedValue === JsonUnitPlaceholder.IGNORE) {
    return true;
  }

  if (expectedValue === JsonUnitPlaceholder.ANY_STRING) {
    return typeof actualValue === 'string';
  }

  if (expectedValue === JsonUnitPlaceholder.ANY_NUMBER) {
    return typeof actualValue === 'number';
  }

  if (expectedValue === JsonUnitPlaceholder.ANY_BOOLEAN) {
    return typeof actualValue === 'boolean';
  }

  if (expectedValue === JsonUnitPlaceholder.ANY_OBJECT) {
    return typeof actualValue === 'object' && actualValue !== null && !Array.isArray(actualValue);
  }

  if (expectedValue === JsonUnitPlaceholder.ANY_ARRAY) {
    return Array.isArray(actualValue);
  }

  return actualValue === expectedValue;
}

export {
  matchesQuery,
  matchesHeaders,
  matchesBody,
  matchesJsonWithUnit
};
