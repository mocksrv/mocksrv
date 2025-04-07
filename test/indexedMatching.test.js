import test from 'node:test';
import assert from 'node:assert';
import { addExpectation, findMatchingExpectation, clearExpectations } from '../app/store/expectationStore.js';

test('finds expectations using method index', async (t) => {
  await clearExpectations();

  const getId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: { status: 200 }
  });
  
  const postId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/api/resource'
    },
    httpResponse: { status: 201 }
  });

  const getRequest = {
    method: 'GET',
    path: '/api/resource',
    query: {},
    headers: {},
    body: null
  };
  
  const postRequest = {
    method: 'POST',
    path: '/api/resource',
    query: {},
    headers: {},
    body: {}
  };
  
  const getResult = findMatchingExpectation(getRequest);
  const postResult = findMatchingExpectation(postRequest);
  
  assert.strictEqual(getResult.id, getId);
  assert.strictEqual(postResult.id, postId);
});

test('finds expectations using path segment index', async (t) => {
  await clearExpectations();

  const apiId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: { status: 200 }
  });
  
  const authId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/auth/login'
    },
    httpResponse: { status: 200 }
  });

  const apiRequest = {
    method: 'GET',
    path: '/api/resource',
    query: {},
    headers: {},
    body: null
  };
  
  const authRequest = {
    method: 'GET',
    path: '/auth/login',
    query: {},
    headers: {},
    body: null
  };
  
  const apiResult = findMatchingExpectation(apiRequest);
  const authResult = findMatchingExpectation(authRequest);
  
  assert.strictEqual(apiResult.id, apiId);
  assert.strictEqual(authResult.id, authId);
});

test('finds expectations with wildcards in paths', async (t) => {
  await clearExpectations();

  const wildcardId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/users/*'
    },
    httpResponse: { status: 200 }
  });

  const request = {
    method: 'GET',
    path: '/api/users/123',
    query: {},
    headers: {},
    body: null
  };

  const result = findMatchingExpectation(request);
  assert.strictEqual(result.id, wildcardId);
});

test('finds expectations using combined method and path indices', async (t) => {
  await clearExpectations();

  const getApiId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/users'
    },
    httpResponse: { status: 200 }
  });
  
  await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/api/users'
    },
    httpResponse: { status: 201 }
  });
  
  await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/auth/login'
    },
    httpResponse: { status: 200 }
  });

  for (let i = 0; i < 10; i++) {
    await addExpectation({
      type: 'http',
      httpRequest: {
        method: 'GET',
        path: `/other/path${i}`
      },
      httpResponse: { status: 200 }
    });
  }

  const request = {
    method: 'GET',
    path: '/api/users',
    query: {},
    headers: {},
    body: null
  };
  
  const result = findMatchingExpectation(request);
  assert.strictEqual(result.id, getApiId);
});

test('removes expectations from indices when deleted', async (t) => {
  await clearExpectations();

  const id = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: { status: 200 }
  });

  await clearExpectations();

  const request = {
    method: 'GET',
    path: '/api/resource',
    query: {},
    headers: {},
    body: null
  };
  
  const result = findMatchingExpectation(request);
  assert.strictEqual(result, null);
}); 