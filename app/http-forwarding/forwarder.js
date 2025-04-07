/**
 * HTTP Forwarding module for forwarding requests to other servers
 * @module http-forwarding/forwarder
 */

import fetch from 'node-fetch';
import { HttpScheme } from '../expectations/types.js';

/**
 * Builds a URL for forwarding based on the configuration
 * @param {Object} request - Original request
 * @param {Object} forwardConfig - Forward configuration
 * @returns {string} The forward URL
 */
export function buildForwardUrl(request, forwardConfig) {
  const { host, port, scheme = HttpScheme.HTTP } = forwardConfig;

  const protocol = scheme.toLowerCase();
  const path = request.path || '/';

  // Build query string
  let queryString = '';
  if (request.query && Object.keys(request.query).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query)) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.append(key, value);
      }
    }
    queryString = `?${params.toString()}`;
  }

  return `${protocol}://${host}:${port}${path}${queryString}`;
}

/**
 * Forwards a request to another server
 * @param {Object} request - Original request
 * @param {Object} forwardConfig - Forward configuration
 * @returns {Promise<Object>} The response from the forwarded server
 */
export async function forwardRequest(request, forwardConfig) {
  const url = buildForwardUrl(request, forwardConfig);

  // Prepare options for fetch
  const options = {
    method: request.method,
    headers: {},
    redirect: 'follow'
  };

  // Copy headers from the original request
  if (request.headers) {
    for (const [key, value] of Object.entries(request.headers)) {
      // Skip headers that shouldn't be forwarded
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        options.headers[key] = value;
      }
    }
  }

  // Set body if present
  if (request.body) {
    // For JSON content type, stringify the body
    if (request.headers &&
      request.headers['content-type'] &&
      request.headers['content-type'].includes('application/json')) {
      options.body = JSON.stringify(request.body);
    } else if (typeof request.body === 'string') {
      options.body = request.body;
    } else {
      options.body = JSON.stringify(request.body);
    }
  }

  try {
    const response = await fetch(url, options);

    // Prepare headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get response body
    let body;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else if (contentType &&
      (contentType.includes('text/') ||
        contentType.includes('application/xml') ||
        contentType.includes('application/javascript'))) {
      body = await response.text();
    } else {
      body = await response.buffer();
    }

    return {
      status: response.status,
      headers,
      body
    };
  } catch (error) {
    throw new Error(`Failed to forward request: ${error.message}`);
  }
} 