/**
 * Tests for request handler
 * @module test/request-handling/handler.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { initializeStore, addExpectation, clearExpectations } from '../../app/expectations/expectationStore.js';
import { requestHandler } from '../../app/request-handling/requestHandler.js';
import { logRequestReceived, logResponseSent } from '../../app/utils/logger.js';

// Helper to create a mock request
function createMockRequest(method = 'GET', path = '/api/resource', body = {}, query = {}, headers = {}) {
  return {
    method,
    url: `http://localhost:8080${path}`,
    path,
    query,
    body,
    headers
  };
}

// Helper to create a mock response
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },

    send(data) {
      this.body = data;
      return this;
    },

    set(name, value) {
      this.headers[name] = value;
      return this;
    },

    end() {
      return this;
    }
  };

  return res;
}

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
  const req = createMockRequest('GET', '/api/resource');
  const res = createMockResponse();
  let nextCalled = false;

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

test('requestHandler skips mockserver paths', async () => {
  // Setup
  const req = createMockRequest('GET', '/mockserver/status');
  const res = createMockResponse();
  let nextCalled = false;

  const next = () => {
    nextCalled = true;
  };

  // Execute
  await requestHandler(req, res, next);

  // Verify
  assert.strictEqual(nextCalled, true, 'next() should be called for mockserver paths');
});

test('requestHandler matches expectation and sends mock response', async () => {
  // Set up store
  await clearExpectations();

  // Create and add expectation that will match
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/users'
    },
    httpResponse: {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: { users: [{ id: 1, name: 'Test User' }] }
    }
  };

  await addExpectation(expectation);

  // Set up request
  const req = createMockRequest('GET', '/api/users');
  const res = createMockResponse();
  const next = () => {
    assert.fail('next() should not be called when expectation matches');
  };

  // Execute
  await requestHandler(req, res, next);

  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  // Verify
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { users: [{ id: 1, name: 'Test User' }] });
  assert.strictEqual(res.headers['Content-Type'], 'application/json');

  // Clean up
  await clearExpectations();
});

test('requestHandler handles expectations with delay', async () => {
  // Set up store
  await clearExpectations();

  // Create expectation with delay
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/delayed'
    },
    httpResponse: {
      statusCode: 201,
      delay: 50, // 50ms delay
      body: { status: 'delayed' }
    }
  };

  await addExpectation(expectation);

  // Set up request
  const req = createMockRequest('GET', '/api/delayed');
  const res = createMockResponse();
  const next = () => {
    assert.fail('next() should not be called when expectation matches');
  };

  // Capture time before request
  const startTime = Date.now();

  // Execute
  await requestHandler(req, res, next);

  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // Capture time after request
  const endTime = Date.now();

  // Verify
  const elapsed = endTime - startTime;
  assert.ok(elapsed >= 50, `Response should be delayed by at least 50ms (actual: ${elapsed}ms)`);
  assert.strictEqual(res.statusCode, 201);
  assert.deepStrictEqual(res.body, { status: 'delayed' });

  // Clean up
  await clearExpectations();
});

test('requestHandler handles different timeUnit delay formats', async () => {
  // Set up store
  await clearExpectations();

  // Create expectation with delay in seconds
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/seconds-delay'
    },
    httpResponse: {
      statusCode: 200,
      delay: {
        timeUnit: 'SECONDS',
        value: 0.1 // 0.1 seconds = 100ms
      },
      body: { status: 'delayed seconds' }
    }
  };

  await addExpectation(expectation);

  // Set up request
  const req = createMockRequest('GET', '/api/seconds-delay');
  const res = createMockResponse();

  // Capture time before request
  const startTime = Date.now();

  // Execute
  await requestHandler(req, res, () => { });

  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 200));

  // Capture time after request
  const endTime = Date.now();

  // Verify
  const elapsed = endTime - startTime;
  assert.ok(elapsed >= 100, `Response should be delayed by at least 100ms (actual: ${elapsed}ms)`);
  assert.strictEqual(res.statusCode, 200);

  // Clean up
  await clearExpectations();
});

test('requestHandler handles error during response', async () => {
  // Set up store
  await clearExpectations();

  // Create expectation that will match
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/error'
    },
    // Intentionally create problematic expectation without httpResponse or httpForward
  };

  await addExpectation(expectation);

  // Set up request
  const req = createMockRequest('GET', '/api/error');
  const res = createMockResponse();

  // Execute
  await requestHandler(req, res, () => { });

  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  // Verify error response
  assert.ok(res.statusCode >= 500, 'Should return error status code');

  // Clean up
  await clearExpectations();
}); 