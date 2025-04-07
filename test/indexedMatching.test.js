import test from 'node:test';
import assert from 'node:assert';
import { addExpectation, findMatchingExpectation, clearExpectations } from '../src/store/expectationStore.js';

// Test weryfikujący indeksowanie według metody HTTP
test('finds expectations using method index', async (t) => {
  // Najpierw wyczyść wszystkie oczekiwania
  await clearExpectations();
  
  // Dodaj oczekiwania dla różnych metod
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
  
  // Sprawdź, czy indeks metod działa prawidłowo
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

// Test weryfikujący indeksowanie według segmentu bazowego ścieżki
test('finds expectations using path segment index', async (t) => {
  // Najpierw wyczyść wszystkie oczekiwania
  await clearExpectations();
  
  // Dodaj oczekiwania dla różnych ścieżek bazowych
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
  
  // Sprawdź, czy indeks ścieżek działa prawidłowo
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

// Test weryfikujący prawidłowe indeksowanie oczekiwań z wildcardami
test('finds expectations with wildcards in paths', async (t) => {
  // Najpierw wyczyść wszystkie oczekiwania
  await clearExpectations();
  
  // Dodaj oczekiwanie z wildcardem
  const wildcardId = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/users/*'
    },
    httpResponse: { status: 200 }
  });
  
  // Sprawdź, czy oczekiwanie z wildcardem jest prawidłowo znajdowane
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

// Test weryfikujący złożone indeksowanie (metoda + ścieżka)
test('finds expectations using combined method and path indices', async (t) => {
  // Najpierw wyczyść wszystkie oczekiwania
  await clearExpectations();
  
  // Dodaj wiele oczekiwań z różnymi kombinacjami metod i ścieżek
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
  
  // Dodaj jeszcze 10 innych oczekiwań, aby sprawdzić wydajność
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
  
  // Sprawdź, czy oczekiwanie jest prawidłowo znajdowane mimo dużej liczby innych oczekiwań
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

// Test weryfikujący usuwanie oczekiwań z indeksów
test('removes expectations from indices when deleted', async (t) => {
  // Najpierw wyczyść wszystkie oczekiwania
  await clearExpectations();
  
  // Dodaj oczekiwanie
  const id = await addExpectation({
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    },
    httpResponse: { status: 200 }
  });
  
  // Usuń to oczekiwanie
  await clearExpectations();
  
  // Sprawdź, czy jest prawidłowo usunięte z indeksów
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