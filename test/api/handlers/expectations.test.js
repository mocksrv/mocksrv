/**
 * Test modułu API handlerów oczekiwań
 * @module test/api/handlers/expectations
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  clearExpectations,
  addExpectation,
  getExpectation,
  getAllExpectations,
  removeExpectation
} from '../../../app/expectations/expectationStore.js';
import { createExpectationHandler } from '../../../app/api/handlers/expectations/createExpectationHandler.js';
import { listExpectationsHandler } from '../../../app/api/handlers/expectations/listExpectationsHandler.js';
import { deleteExpectationHandler } from '../../../app/api/handlers/expectations/deleteExpectationHandler.js';
import { clearExpectationsHandler } from '../../../app/api/handlers/expectations/clearExpectationsHandler.js';
import { getExpectationHandler } from '../../../app/api/handlers/expectations/getExpectationHandler.js';

// Helper to create mock Request
function createMockRequest(params = {}, body = {}, query = {}) {
  return {
    params,
    body,
    query
  };
}

// Helper to create mock Response
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

    header(name, value) {
      this.headers[name] = value;
      return this;
    },

    end() {
      return this;
    }
  };

  return res;
}

test('powinien eksportować poprawnie funkcje handlerów oczekiwań', async () => {
  // Przygotowanie testu
  await clearExpectations();

  // Sprawdzenie czy eksportowane funkcje są rzeczywiście funkcjami
  assert.strictEqual(typeof createExpectationHandler, 'function', 'createExpectationHandler powinien być funkcją');
  assert.strictEqual(typeof listExpectationsHandler, 'function', 'listExpectationsHandler powinien być funkcją');
  assert.strictEqual(typeof deleteExpectationHandler, 'function', 'deleteExpectationHandler powinien być funkcją');
  assert.strictEqual(typeof clearExpectationsHandler, 'function', 'clearExpectationsHandler powinien być funkcją');
  assert.strictEqual(typeof getExpectationHandler, 'function', 'getExpectationHandler powinien być funkcją');

  // Sprzątanie po teście
  await clearExpectations();
});

test('createExpectationHandler powinien utworzyć nowe oczekiwanie', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const mockExpectation = {
    httpRequest: {
      method: 'GET',
      path: '/test/path'
    },
    httpResponse: {
      statusCode: 200,
      body: { message: 'Success' }
    }
  };

  const req = createMockRequest({}, mockExpectation);
  const res = createMockResponse();

  // Wywołanie funkcji
  await createExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 201, 'Status code should be 201 Created');
  assert.ok(Array.isArray(res.body), 'Response should be an array');
  assert.strictEqual(res.body.length, 1, 'Response should contain one expectation');
  assert.ok(res.body[0].id, 'Response should contain an expectation with ID');

  // Sprawdź, czy oczekiwanie zostało zapisane w store
  const allExpectations = await getAllExpectations();
  assert.strictEqual(allExpectations.length, 1, 'Should have one expectation');
  assert.deepStrictEqual(
    allExpectations[0].httpRequest,
    mockExpectation.httpRequest,
    'Stored request should match'
  );

  // Sprzątanie po teście
  await clearExpectations();
});

test('createExpectationHandler powinien zwrócić błąd przy braku httpRequest', async () => {
  // Przygotowanie testu
  const req = createMockRequest({}, {
    httpResponse: { statusCode: 200 }
  });
  const res = createMockResponse();

  // Wywołanie funkcji
  await createExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 400, 'Status code should be 400 Bad Request');
  assert.ok(res.body.error, 'Response should contain an error message');
});

test('listExpectationsHandler powinien zwrócić listę wszystkich oczekiwań', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const mockExpectation = {
    httpRequest: {
      method: 'GET',
      path: '/test/path'
    },
    httpResponse: {
      statusCode: 200
    }
  };

  await addExpectation(mockExpectation);

  const req = createMockRequest();
  const res = createMockResponse();

  // Wywołanie funkcji
  await listExpectationsHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 200, 'Status code should be 200 OK');
  assert.ok(Array.isArray(res.body), 'Response should be an array');
  assert.strictEqual(res.body.length, 1, 'Response should contain one expectation');

  // Sprzątanie po teście
  await clearExpectations();
});

test('getExpectationHandler powinien zwrócić konkretne oczekiwanie', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const mockExpectation = {
    httpRequest: {
      method: 'GET',
      path: '/test/path'
    },
    httpResponse: {
      statusCode: 200
    }
  };

  const id = await addExpectation(mockExpectation);

  const req = createMockRequest({ id });
  const res = createMockResponse();

  // Wywołanie funkcji
  getExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 200, 'Status code should be 200 OK');
  assert.strictEqual(res.body.id, id, 'Response should contain the correct expectation');

  // Sprzątanie po teście
  await clearExpectations();
});

test('getExpectationHandler powinien zwrócić 404 gdy oczekiwanie nie istnieje', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const req = createMockRequest({ id: 'non-existent-id' });
  const res = createMockResponse();

  // Wywołanie funkcji
  getExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 404, 'Status code should be 404 Not Found');
  assert.ok(res.body.error, 'Response should contain an error message');

  // Sprzątanie po teście
  await clearExpectations();
});

test('deleteExpectationHandler powinien usunąć konkretne oczekiwanie', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const mockExpectation = {
    httpRequest: {
      method: 'GET',
      path: '/test/path'
    },
    httpResponse: {
      statusCode: 200
    }
  };

  const id = await addExpectation(mockExpectation);

  // Upewnij się, że oczekiwanie zostało dodane
  const expectationBefore = getExpectation(id);
  assert.ok(expectationBefore, 'Expectation should exist before deletion');

  const req = createMockRequest({ id });
  const res = createMockResponse();

  // Wywołanie funkcji
  await deleteExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 204, 'Status code should be 204 No Content');

  // Sprawdź czy oczekiwanie zostało usunięte
  const expectationAfter = getExpectation(id);
  assert.strictEqual(expectationAfter, undefined, 'Expectation should be removed');

  // Sprzątanie po teście
  await clearExpectations();
});

test('deleteExpectationHandler powinien zwrócić 400 gdy oczekiwanie nie istnieje', async () => {
  // Przygotowanie testu
  await clearExpectations();

  const req = createMockRequest({ id: 'non-existent-id' });
  const res = createMockResponse();

  // Wywołanie funkcji
  await deleteExpectationHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 400, 'Status code should be 400 Bad Request');
  assert.ok(res.body.error, 'Response should contain an error message');
  assert.strictEqual(res.body.error, 'incorrect request format', 'Error should indicate incorrect request format');

  // Sprzątanie po teście
  await clearExpectations();
});

test('clearExpectationsHandler powinien usunąć wszystkie oczekiwania', async () => {
  // Przygotowanie testu
  await clearExpectations();

  // Dodaj kilka oczekiwań
  await addExpectation({
    httpRequest: { method: 'GET', path: '/test1' },
    httpResponse: { statusCode: 200 }
  });

  await addExpectation({
    httpRequest: { method: 'POST', path: '/test2' },
    httpResponse: { statusCode: 201 }
  });

  // Upewnij się, że oczekiwania zostały dodane
  const beforeExpectations = await getAllExpectations();
  assert.strictEqual(beforeExpectations.length, 2, 'Should have two expectations');

  const req = createMockRequest();
  const res = createMockResponse();

  // Wywołanie funkcji
  await clearExpectationsHandler(req, res);

  // Weryfikacja wyników
  assert.strictEqual(res.statusCode, 200, 'Status code should be 200 OK');
  assert.deepStrictEqual(res.body, { message: 'expectations and recorded requests cleared' }, 'Should return success message');

  // Sprawdź czy wszystkie oczekiwania zostały usunięte
  const afterExpectations = await getAllExpectations();
  assert.strictEqual(afterExpectations.length, 0, 'Should have no expectations');

  // Sprzątanie po teście
  await clearExpectations();
}); 