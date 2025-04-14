/**
 * Indexer for expectations to enable faster lookups
 * @module expectations/indexers/indexer
 */

let methodIndex = new Map();
let pathIndex = new Map();
let wildcardExpectations = new Set();

/**
 * Gets the base path segment from a given path
 * @param {string} path - The path to extract the base segment from
 * @returns {string|null} Base path segment or null
 */
export function getBasePathSegment(path) {
  if (!path) return null;
  
  const segments = path.split('/').filter(segment => segment);
  if (segments.length === 0) return path;
  
  return '/' + segments[0];
}

/**
 * Initializes all indices from a set of expectations
 * @param {Map<string, Object>} expectations - Map of expectations by ID
 */
export function initializeIndices(expectations) {
  methodIndex = new Map();
  pathIndex = new Map();
  wildcardExpectations = new Set();

  for (const [id, expectation] of expectations.entries()) {
    indexExpectation(id, expectation);
  }
}

/**
 * Indexes a single expectation
 * @param {string} id - Expectation ID
 * @param {Object} expectation - Expectation object
 */
export function indexExpectation(id, expectation) {
  if (!expectation.httpRequest) {
    console.log('Skipping non-http expectation (no httpRequest):', id);
    return;
  }

  const isForwardExpectation = !!expectation.httpForward;
  const isResponseExpectation = !!expectation.httpResponse;

  if (!isForwardExpectation && !isResponseExpectation) {
    return;
  }

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

    if (pathValue.includes('*') || pathValue.includes('.') || 
        pathValue.includes('[') || pathValue.includes('(') || 
        pathValue.includes('?') || pathValue.includes('+')) {
      
      wildcardExpectations.add(id);
    } else {
      const path = getBasePathSegment(pathValue);
      if (path) {
        if (!pathIndex.has(path)) {
          pathIndex.set(path, new Set());
        }
        pathIndex.get(path).add(id);
      }
    }
  }
  
  if (isForwardExpectation) {
    wildcardExpectations.add(id);
  }
}

/**
 * Removes an expectation from all indices
 * @param {string} id - Expectation ID to remove
 * @param {Object} expectation - Expectation object
 */
export function removeFromIndices(id, expectation) {
  if (!expectation.httpRequest) return;

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
      const path = getBasePathSegment(pathValue);
      if (path && pathIndex.has(path)) {
        pathIndex.get(path).delete(id);
      }
    }
  }
}

/**
 * Gets candidate expectation IDs for a request
 * @param {Object} request - Request to match
 * @returns {Set<string>} Set of candidate expectation IDs
 */
export function getCandidateExpectationIds(request) {
  const candidates = new Set();

  if (methodIndex.has(request.method)) {
    methodIndex.get(request.method).forEach(id => candidates.add(id));
  }

  wildcardExpectations.forEach(id => candidates.add(id));

  const path = getBasePathSegment(request.path);

  if (path && pathIndex.has(path)) {
    pathIndex.get(path).forEach(id => candidates.add(id));
  }

  return candidates;
}
