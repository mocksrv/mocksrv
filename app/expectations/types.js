/**
 * Types for expectations
 * @module expectations/types
 */

/**
 * Types of expectations supported by the MockServer
 * @enum {string}
 */
export const ExpectationType = {
  HTTP: 'http'
};

/**
 * Types of body matchers for HTTP expectations
 * @enum {string}
 */
export const BodyMatcherType = {
  JSON: 'json',
  JSON_PATH: 'jsonPath',
  XPATH: 'xpath',
  REGEX: 'regex',
  STRING: 'string'
};

/**
 * Types of request matching strategies
 * @enum {string}
 */
export const MatchType = {
  STRICT: 'strict',
  ONLY_MATCHING_FIELDS: 'onlyMatchingFields'
};

/**
 * HTTP schemes supported for request forwarding
 * @enum {string}
 */
export const HttpScheme = {
  HTTP: 'HTTP',
  HTTPS: 'HTTPS'
};

/**
 * JSON Unit placeholders for flexible JSON matching
 * @enum {string}
 */
export const JsonUnitPlaceholder = {
  IGNORE: '${json-unit.ignore}',
  ANY_STRING: '${json-unit.any-string}',
  ANY_NUMBER: '${json-unit.any-number}',
  ANY_BOOLEAN: '${json-unit.any-boolean}',
  ANY_OBJECT: '${json-unit.any-object}',
  ANY_ARRAY: '${json-unit.any-array}'
};

/**
 * Creates an HTTP forward configuration
 * @param {string} host - Target host
 * @param {number} port - Target port
 * @param {HttpScheme} [scheme=HttpScheme.HTTP] - HTTP scheme to use
 * @returns {Object} HTTP forward configuration
 */
export function createHttpForward(host, port, scheme = HttpScheme.HTTP) {
  return {
    host,
    port,
    scheme
  };
}

/**
 * Creates an HTTP expectation
 * @param {Object} params - Expectation parameters
 * @param {string} [params.id] - Expectation ID
 * @param {string} params.method - HTTP method
 * @param {string} params.path - Request path
 * @param {Object} [params.query] - Query parameters
 * @param {Object} [params.headers] - Request headers
 * @param {*} [params.body] - Request body
 * @param {BodyMatcherType} [params.bodyMatcherType=BodyMatcherType.JSON] - Body matcher type
 * @param {MatchType} [params.matchType=MatchType.STRICT] - Match type
 * @param {Object} params.response - Response configuration
 * @returns {Object} HTTP expectation
 */
export function createHttpExpectation({
  id,
  method,
  path,
  query,
  headers,
  body,
  bodyMatcherType = BodyMatcherType.JSON,
  matchType = MatchType.STRICT,
  response
}) {
  return {
    id,
    type: ExpectationType.HTTP,
    httpRequest: {
      method,
      path,
      query,
      headers,
      matchType,
      body: body ? {
        type: bodyMatcherType,
        value: body
      } : undefined
    },
    httpResponse: response
  };
} 