/**
 * Tests for HTTP forwarder
 * @module test/http-forwarding/forwarder.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { buildForwardUrl, forwardRequest } from '../../app/http-forwarding/forwarder.js';

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