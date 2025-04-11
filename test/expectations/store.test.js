/**
 * Tests for expectation store
 * @module test/expectations/store.test
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  initializeStore,
  addExpectation,
  getExpectation,
  getAllExpectations,
  removeExpectation,
  clearExpectations,
  getExpectationsMap
} from '../../app/expectations/expectationStore.js';

test('addExpectation adds a valid expectation to store', async (t) => {
  
  await initializeStore();

  
  const expectation = {
    id: 'test-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  
  const id = await addExpectation(expectation);

  
  assert.ok(id);

  
  const stored = getExpectation(id);
  assert.ok(stored);
  assert.strictEqual(stored.httpRequest.method, 'GET');

  
  await clearExpectations();
});

test('addExpectation generates ID when not provided', async (t) => {
  
  await initializeStore();

  
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  
  const id = await addExpectation(expectation);

  
  assert.ok(id);

  
  const stored = getExpectation(id);
  assert.ok(stored, 'Expectation should be stored with generated ID');

  
  await clearExpectations();
});

test('getExpectation returns stored expectation', async (t) => {
  
  await initializeStore();

  
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  const id = await addExpectation(expectation);

  
  const stored = getExpectation(id);

  
  assert.ok(stored);
  assert.strictEqual(stored.httpRequest.method, 'GET');
  assert.strictEqual(stored.httpResponse.statusCode, 200);

  
  await clearExpectations();
});

test('removeExpectation removes expectation from store', async (t) => {
  
  await initializeStore();

  
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  const id = await addExpectation(expectation);

  
  const stored = getExpectation(id);
  assert.ok(stored);

  
  const result = await removeExpectation(id);

  
  assert.strictEqual(result, true);

  
  assert.strictEqual(getExpectation(id), undefined);

  
  await clearExpectations();
});

test('getAllExpectations returns all expectations', async (t) => {
  
  await initializeStore();

  
  const expectation1 = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource1'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success 1' })
    }
  };

  const expectation2 = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/api/resource2'
    },
    httpResponse: {
      statusCode: 201,
      body: JSON.stringify({ message: 'Success 2' })
    }
  };

  await addExpectation(expectation1);
  await addExpectation(expectation2);

  
  const expectations = getAllExpectations();

  
  assert.strictEqual(expectations.length, 2);

  
  await clearExpectations();
});

test('clearExpectations clears all expectations', async (t) => {
  
  await initializeStore();

  
  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    }
  };

  await addExpectation(expectation);

  
  const expectations = getAllExpectations();
  assert.ok(expectations.length > 0);

  
  await clearExpectations();

  
  const afterClear = getAllExpectations();
  assert.strictEqual(afterClear.length, 0);
}); 