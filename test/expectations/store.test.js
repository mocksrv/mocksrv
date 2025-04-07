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
  // Initialize store
  await initializeStore();

  // Create valid expectation
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

  // Add expectation
  const id = await addExpectation(expectation);

  // Assert success
  assert.ok(id);

  // Verify expectation was added
  const stored = getExpectation(id);
  assert.ok(stored);
  assert.strictEqual(stored.httpRequest.method, 'GET');

  // Clean up
  await clearExpectations();
});

test('addExpectation generates ID when not provided', async (t) => {
  // Initialize store
  await initializeStore();

  // Create expectation without ID
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

  // Add expectation
  const id = await addExpectation(expectation);

  // Assert success and ID generation
  assert.ok(id);

  // Verify expectation was added with generated ID
  const stored = getExpectation(id);
  assert.ok(stored, 'Expectation should be stored with generated ID');

  // Clean up
  await clearExpectations();
});

test('getExpectation returns stored expectation', async (t) => {
  // Initialize store
  await initializeStore();

  // Create and add expectation
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

  // Get the expectation
  const stored = getExpectation(id);

  // Assert data
  assert.ok(stored);
  assert.strictEqual(stored.httpRequest.method, 'GET');
  assert.strictEqual(stored.httpResponse.statusCode, 200);

  // Clean up
  await clearExpectations();
});

test('removeExpectation removes expectation from store', async (t) => {
  // Initialize store
  await initializeStore();

  // Create and add expectation
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

  // Verify expectation exists
  const stored = getExpectation(id);
  assert.ok(stored);

  // Remove expectation
  const result = await removeExpectation(id);

  // Assert success
  assert.strictEqual(result, true);

  // Verify expectation was removed
  assert.strictEqual(getExpectation(id), undefined);

  // Clean up
  await clearExpectations();
});

test('getAllExpectations returns all expectations', async (t) => {
  // Initialize store
  await initializeStore();

  // Create and add multiple expectations
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

  // Get all expectations
  const expectations = getAllExpectations();

  // Assert correct expectations returned
  assert.strictEqual(expectations.length, 2);

  // Clean up
  await clearExpectations();
});

test('clearExpectations clears all expectations', async (t) => {
  // Initialize store
  await initializeStore();

  // Create and add expectation
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

  // Verify expectation exists
  const expectations = getAllExpectations();
  assert.ok(expectations.length > 0);

  // Clear expectations
  await clearExpectations();

  // Verify store is empty
  const afterClear = getAllExpectations();
  assert.strictEqual(afterClear.length, 0);
}); 