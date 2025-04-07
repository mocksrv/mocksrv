/**
 * Tests for request handler
 * @module test/request-handling/handler.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { initializeStore, addExpectation, clearExpectations } from '../../app/expectations/expectationStore.js';
import { requestHandler } from '../../app/request-handling/requestHandler.js';

test('requestHandler calls next when no expectation matches', async (t) => {
  // Set up store
  await initializeStore();

  // Create and add expectation (that won't match request)
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/api/other'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  await addExpectation(expectation);

  // Set up request and response objects
  const req = {
    method: 'GET',
    url: 'http://localhost:8080/api/resource',
    path: '/api/resource',
    headers: {}
  };

  let responseStatusCode = 0;
  let responseBody = '';
  let nextCalled = false;

  const res = {
    status: (code) => {
      responseStatusCode = code;
      return res;
    },
    json: (body) => {
      responseBody = JSON.stringify(body);
      return res;
    },
    end: () => res
  };

  // Mock next function
  const next = () => {
    nextCalled = true;
  };

  // Call requestHandler
  await requestHandler(req, res, next);

  // Verify next was called
  assert.strictEqual(nextCalled, true);

  // Clean up
  await clearExpectations();
}); 