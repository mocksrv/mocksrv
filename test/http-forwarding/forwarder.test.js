/**
 * Tests for HTTP forwarder
 * @module test/http-forwarding/forwarder.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { buildForwardUrl, forwardRequest } from '../../app/http-forwarding/forwarder.js';
import http from 'node:http';
import { once } from 'node:events';

test('buildForwardUrl constructs proper URL', (t) => {
  // Test with minimal data
  const request = {
    path: '/api/resource'
  };

  const forwardConfig = {
    host: 'example.com',
    port: 80
  };

  const url = buildForwardUrl(request, forwardConfig);
  assert.strictEqual(url, 'http://example.com:80/api/resource');

  // Test with different scheme and query parameters
  const requestWithQuery = {
    path: '/api/resource',
    query: {
      id: '123',
      filter: 'active'
    }
  };

  const forwardConfigWithScheme = {
    host: 'secure.example.com',
    port: 443,
    scheme: 'HTTPS'
  };

  const urlWithQueryAndScheme = buildForwardUrl(requestWithQuery, forwardConfigWithScheme);
  assert.ok(
    urlWithQueryAndScheme === 'https://secure.example.com:443/api/resource?id=123&filter=active' ||
    urlWithQueryAndScheme === 'https://secure.example.com:443/api/resource?filter=active&id=123'
  );
});

test('buildForwardUrl handles array query params correctly', (t) => {
  const request = {
    path: '/api/search',
    query: {
      tags: ['node', 'javascript', 'testing']
    }
  };

  const forwardConfig = {
    host: 'api.example.com',
    port: 8080
  };

  const url = buildForwardUrl(request, forwardConfig);

  // The order of query parameters is not guaranteed, so we need to check for different possibilities
  assert.ok(url.startsWith('http://api.example.com:8080/api/search?'));
  assert.ok(url.includes('tags=node'));
  assert.ok(url.includes('tags=javascript'));
  assert.ok(url.includes('tags=testing'));
});

test('buildForwardUrl with empty path uses root path', (t) => {
  const request = {};

  const forwardConfig = {
    host: 'example.com',
    port: 8080
  };

  const url = buildForwardUrl(request, forwardConfig);
  assert.strictEqual(url, 'http://example.com:8080/');
});

test('buildForwardUrl with scheme defaults to HTTP', (t) => {
  const request = {
    path: '/test'
  };

  const forwardConfig = {
    host: 'example.com',
    port: 8080
  };

  const url = buildForwardUrl(request, forwardConfig);
  assert.strictEqual(url, 'http://example.com:8080/test');
});

/**
 * Setup a simple HTTP server for testing forwardRequest
 * @returns {Promise<{server: http.Server, port: number}>}
 */
async function setupTestServer(responseConfig = {}) {
  const { statusCode = 200, headers = {}, body = { result: 'ok' } } = responseConfig;

  const server = http.createServer((req, res) => {
    // Set response headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Set status code
    res.statusCode = statusCode;

    // Get request body if any
    let requestBody = '';
    req.on('data', chunk => {
      requestBody += chunk;
    });

    req.on('end', () => {
      // Send response
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
  });

  // Start server on a random available port
  server.listen(0);
  await once(server, 'listening');

  // Get the assigned port
  const port = server.address().port;

  return { server, port };
}

test('forwardRequest correctly forwards a GET request', async (t) => {
  const { server, port } = await setupTestServer({
    headers: { 'X-Test': 'Value' },
    body: { message: 'response from test server' }
  });

  try {
    const request = {
      method: 'GET',
      path: '/forward-test',
      headers: {
        'user-agent': 'test-client',
        'accept': 'application/json'
      }
    };

    const forwardConfig = {
      host: 'localhost',
      port
    };

    const response = await forwardRequest(request, forwardConfig);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['x-test'], 'Value');
    assert.deepStrictEqual(response.body, { message: 'response from test server' });
  } finally {
    server.close();
  }
});

test('forwardRequest correctly handles custom headers', async (t) => {
  const { server, port } = await setupTestServer();

  try {
    const request = {
      method: 'GET',
      path: '/custom-headers',
      headers: {
        'X-Custom-Header': 'Custom Value',
        'Authorization': 'Bearer token123',
        'host': 'should-be-removed', // Host header should be removed
        'connection': 'should-be-removed', // Connection header should be removed
        'content-length': '0' // Content-Length header should be removed
      }
    };

    const forwardConfig = {
      host: 'localhost',
      port
    };

    const response = await forwardRequest(request, forwardConfig);

    assert.strictEqual(response.status, 200);
  } finally {
    server.close();
  }
}); 