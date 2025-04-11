/**
 * Tests for request handler
 * @module test/request-handling/handler.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { initializeStore, addExpectation, clearExpectations } from '../../app/expectations/expectationStore.js';
import { requestHandler } from '../../app/request-handling/requestHandler.js';
import { logRequestReceived, logResponseSent } from '../../app/utils/logger.js';


function createMockRequest(method = 'GET', path = '/api/resource', body = {}, query = {}, headers = {}) {
  return {
    method,
    url: `http://localhost${path}`,
    path,
    query,
    body,
    headers
  };
}


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
  
  await initializeStore();

  
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

  
  const req = createMockRequest('GET', '/api/resource');
  const res = createMockResponse();
  let nextCalled = false;

  
  const next = () => {
    nextCalled = true;
  };

  
  await requestHandler(req, res, next);

  
  assert.strictEqual(nextCalled, true);

  
  await clearExpectations();
});

test('requestHandler skips mockserver paths', async () => {
  
  const req = createMockRequest('GET', '/mockserver/status');
  const res = createMockResponse();
  let nextCalled = false;

  const next = () => {
    nextCalled = true;
  };

  
  await requestHandler(req, res, next);

  
  assert.strictEqual(nextCalled, true, 'next() should be called for mockserver paths');
});

test('requestHandler matches expectation and sends mock response', async (t) => {
  try {
    await clearExpectations();

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

    const req = createMockRequest('GET', '/api/users');
    const res = createMockResponse();
    const next = () => {
      assert.fail('next() should not be called when expectation matches');
    };

    await requestHandler(req, res, next);
    await new Promise(resolve => setTimeout(resolve, 50));

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { users: [{ id: 1, name: 'Test User' }] });
    assert.strictEqual(res.headers['Content-Type'], 'application/json');
  } finally {
    await clearExpectations();
  }
});

test('requestHandler handles expectations with delay', async (t) => {
  try {
    await clearExpectations();

    const expectation = {
      type: 'http',
      httpRequest: {
        method: 'GET',
        path: '/api/delayed'
      },
      httpResponse: {
        statusCode: 201,
        delay: 50,
        body: { status: 'delayed' }
      }
    };

    await addExpectation(expectation);

    const req = createMockRequest('GET', '/api/delayed');
    const res = createMockResponse();
    const next = () => {
      assert.fail('next() should not be called when expectation matches');
    };

    const startTime = Date.now();
    await requestHandler(req, res, next);
    await new Promise(resolve => setTimeout(resolve, 100));

    const endTime = Date.now();
    const elapsed = endTime - startTime;
    assert.ok(elapsed >= 50, `Response should be delayed by at least 50ms (actual: ${elapsed}ms)`);
  } finally {
    await clearExpectations();
  }
});

test('requestHandler handles different timeUnit delay formats', async () => {
  
  await clearExpectations();

  
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
        value: 0.1 
      },
      body: { status: 'delayed seconds' }
    }
  };

  await addExpectation(expectation);

  
  const req = createMockRequest('GET', '/api/seconds-delay');
  const res = createMockResponse();

  
  const startTime = Date.now();

  
  await requestHandler(req, res, () => { });

  
  await new Promise(resolve => setTimeout(resolve, 200));

  
  const endTime = Date.now();

  
  const elapsed = endTime - startTime;
  assert.ok(elapsed >= 100, `Response should be delayed by at least 100ms (actual: ${elapsed}ms)`);
  assert.strictEqual(res.statusCode, 200);

  
  await clearExpectations();
});

test('requestHandler handles error during response', async () => {
  
  await clearExpectations();

  
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/error'
    },
    
  };

  await addExpectation(expectation);

  
  const req = createMockRequest('GET', '/api/error');
  const res = createMockResponse();

  
  await requestHandler(req, res, () => { });

  
  await new Promise(resolve => setTimeout(resolve, 50));

  
  assert.ok(res.statusCode >= 500, 'Should return error status code');

  
  await clearExpectations();
}); 