import fetch from 'node-fetch';
import { logForwardedRequest, logForwardedResponse } from './logger.js';
import { HttpScheme } from '../types/expectation.js';

/**
 * Forwards a request to a specified target
 * @param {Object} request - Original client request
 * @param {Object} httpForward - Forward configuration
 * @returns {Promise<Object>} - Response from the target server
 */
export async function forwardRequest(request, httpForward) {
  const { host, port, scheme } = httpForward;

  const protocol = scheme === HttpScheme.HTTPS ? 'https' : 'http';
  const portSuffix = (
    (scheme === HttpScheme.HTTP && port === 80) ||
    (scheme === HttpScheme.HTTPS && port === 443)
  ) ? '' : `:${port}`;

  const targetUrl = `${protocol}://${host}${portSuffix}${request.path}`;

  const queryString = buildQueryString(request.query);
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  const headers = { ...request.headers };
  delete headers.host;

  const options = {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    redirect: 'follow'
  };

  logForwardedRequest(fullUrl, options);

  try {
    const response = await fetch(fullUrl, options);
    const responseBody = await parseResponseBody(response);

    const forwardedResponse = {
      status: response.status,
      headers: extractHeaders(response),
      body: responseBody
    };

    logForwardedResponse(forwardedResponse);

    return forwardedResponse;
  } catch (error) {
    console.error(`Error forwarding request to ${fullUrl}:`, error);
    throw error;
  }
}

/**
 * Builds a query string from a parameters object
 * @param {Object} query - Query parameters object
 * @returns {string} - Query string
 */
export function buildQueryString(query) {
  if (!query || Object.keys(query).length === 0) {
    return '';
  }

  return Object.entries(query)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

/**
 * Extracts headers from a fetch response
 * @param {Object} response - Fetch response object
 * @returns {Object} - Headers object
 */
function extractHeaders(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

/**
 * Parses response body based on content type
 * @param {Object} response - Fetch response object
 * @returns {Promise<Object>} - Parsed response body
 */
async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await response.json();
  } else if (
    contentType.includes('text/') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/javascript')
  ) {
    return await response.text();
  } else {
    return await response.buffer();
  }
}